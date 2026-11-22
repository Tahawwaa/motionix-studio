#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { ProjectSchema } from "../../packages/project-schema/index";
import { NovaClient, toolDefinitions, dispatchTool } from "./tools";

export function createNovaServer(
  client = new NovaClient(),
  scope: "read" | "full" = "full",
) {
  const server = new McpServer(
    { name: "nova-motion-studio", version: "0.1.0" },
    {
      instructions:
        "NOVA is a local-first programmatic motion graphics studio, not diffusion video synthesis. Read get_project_schema and get_scene_catalog before editing. Times are integer frames. Validate before save; render and inspect real frames before asking the user to approve a final export. Video renders return job IDs; poll status. Never claim visual inspection without actually viewing returned media. Destructive tools require user authorization and confirm:true.",
    },
  );
  for (const [name, definition] of Object.entries(toolDefinitions)) {
    if (scope === "read" && !definition.readOnly) continue;
    server.registerTool(
      name,
      {
        description: definition.description,
        inputSchema: definition.schema,
        annotations: {
          readOnlyHint: definition.readOnly ?? false,
          destructiveHint: definition.destructive ?? false,
          idempotentHint: definition.readOnly ?? false,
          openWorldHint: false,
        },
      },
      async (args) => {
        try {
          const result = await dispatchTool(name, args, client);
          if (result && typeof result === "object" && "_novaImage" in result) {
            const media = result as unknown as {
              data: string;
              mimeType: string;
              jobId: string;
            };
            return {
              content: [
                { type: "image", data: media.data, mimeType: media.mimeType },
                {
                  type: "text",
                  text: `Actual rendered PNG for job ${media.jobId}`,
                },
              ],
              structuredContent: { jobId: media.jobId },
            };
          }
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            structuredContent: { result },
          };
        } catch (error) {
          const message =
            error instanceof z.ZodError
              ? error.issues
                  .map((i) => `${i.path.join(".") || "input"}: ${i.message}`)
                  .join("; ")
              : error instanceof Error
                ? error.message
                : "NOVA operation failed";
          return {
            isError: true,
            content: [{ type: "text", text: message.slice(0, 4000) }],
          };
        }
      },
    );
  }
  server.registerResource(
    "project-schema",
    "nova://schema/project",
    {
      description: "Canonical schemaVersion 1 project model",
      mimeType: "application/schema+json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/schema+json",
          text: JSON.stringify(
            z.toJSONSchema(ProjectSchema, { unrepresentable: "any" }),
          ),
        },
      ],
    }),
  );
  server.registerResource(
    "authoring-guide",
    "nova://docs/authoring",
    {
      description: "Frame timing and safe agent editing workflow",
      mimeType: "text/plain",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/plain",
          text: "1. list_templates / get_scene_catalog. 2. create_from_template. 3. get_project and get_project_schema. 4. update_scene / add_layer / apply_animation / add_keyframe. 5. validate_project. 6. render_contact_sheet or render_frame and inspect actual media using a compatible multimodal client. 7. render_preview and poll get_render_status. 8. Get user approval for final output, then start_render. startFrame is absolute on scenes and scene-local on layers. Keyframe frames are layer-local. Only registered local asset paths are allowed. Programs and expressions are never executable project fields. Built-in visual assets are original programmatic artwork.",
        },
      ],
    }),
  );
  return server;
}
export function createHttpApp(token: string, client = new NovaClient()) {
  if (token.length < 32 || token !== token.trim())
    throw new Error(
      "NOVA_MCP_TOKEN must contain at least 32 characters without surrounding whitespace for HTTP mode",
    );
  const scope = process.env.NOVA_MCP_SCOPE ?? "full";
  if (scope !== "read" && scope !== "full")
    throw new Error("NOVA_MCP_SCOPE must be read or full");
  const app = express();
  app.disable("x-powered-by");
  const expected = createHash("sha256").update(token).digest();
  let calls = 0;
  let windowStart = Date.now();
  app.use(
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      const host = req.headers.host ?? "";
      if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host)) {
        res.status(403).json({ error: "Untrusted Host header" });
        return;
      }
      const origin = req.headers.origin;
      if (origin) {
        try {
          const u = new URL(origin);
          if (!["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)) {
            res.status(403).json({ error: "Untrusted Origin" });
            return;
          }
        } catch {
          res.status(403).json({ error: "Invalid Origin" });
          return;
        }
      }
      const provided =
        req.headers.authorization?.match(/^Bearer (.+)$/)?.[1] ?? "";
      if (
        !timingSafeEqual(
          expected,
          createHash("sha256").update(provided).digest(),
        )
      ) {
        res.status(401).json({ error: "Bearer authentication required" });
        return;
      }
      if (Date.now() - windowStart > 60000) {
        calls = 0;
        windowStart = Date.now();
      }
      if (++calls > 120) {
        res.setHeader("Retry-After", "60");
        res.status(429).json({ error: "Rate limit exceeded" });
        return;
      }
      next();
    },
  );
  app.use(express.json({ limit: "12mb" }));
  app.post("/mcp", async (req: express.Request, res: express.Response) => {
    const server = createNovaServer(client, scope);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent)
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "MCP request failed" },
          id: null,
        });
    }
  });
  app.get("/mcp", (_: express.Request, res: express.Response) => {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Stateless MCP uses POST requests" });
  });
  app.delete("/mcp", (_: express.Request, res: express.Response) => {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Stateless MCP has no persistent session" });
  });
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const tooLarge =
        error &&
        typeof error === "object" &&
        "type" in error &&
        error.type === "entity.too.large";
      res.status(tooLarge ? 413 : 400).json({
        error: tooLarge
          ? "Request body exceeds 12 MiB limit"
          : "Invalid request body",
      });
    },
  );
  return app;
}
async function main() {
  if (process.argv.includes("--http")) {
    const app = createHttpApp(process.env.NOVA_MCP_TOKEN ?? "");
    app.listen(8002, "127.0.0.1", () =>
      process.stderr.write(
        "NOVA authenticated MCP listening on http://127.0.0.1:8002/mcp\n",
      ),
    );
  } else {
    await createNovaServer().connect(new StdioServerTransport());
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "MCP startup failed"}\n`,
    );
    process.exitCode = 1;
  });
}
