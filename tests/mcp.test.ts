import { describe, it, expect, vi } from "vitest";
import {
  NovaClient,
  dispatchTool,
  toolDefinitions,
} from "../services/mcp-server/tools";
import { makeLayer } from "../packages/project-schema";
import { createProject } from "../packages/templates";

function mockClient(initial = createProject()) {
  let stored = structuredClone(initial);
  const fetcher = vi.fn(
    async (url: string | URL | Request, init?: RequestInit) => {
      const path = new URL(String(url)).pathname;
      if (path === "/api/activity")
        return new Response(JSON.stringify({ id: 1 }), {
          headers: { "Content-Type": "application/json" },
        });
      if (path === "/api/projects" && init?.method === "POST") {
        stored = JSON.parse(String(init.body));
        return Response.json(stored);
      }
      if (path === `/api/projects/${stored.id}`) {
        if (init?.method === "PUT") stored = JSON.parse(String(init.body));
        return Response.json(stored);
      }
      if (path === "/api/projects") return Response.json([stored]);
      return Response.json({ error: "Not found" }, { status: 404 });
    },
  ) as unknown as typeof fetch;
  return { client: new NovaClient(fetcher), fetcher, getProject: () => stored };
}
describe("NOVA MCP constrained editing", () => {
  it("publishes a machine-readable canonical schema and deterministic catalogs", async () => {
    const { client } = mockClient();
    const result = (await dispatchTool(
      "get_project_schema",
      {},
      client,
    )) as any;
    expect(result.schema.properties.schemaVersion).toBeDefined();
    expect(Object.keys(toolDefinitions).length).toBeGreaterThan(40);
  });
  it("reads projects and persists a scene patch through the shared schema", async () => {
    const p = createProject();
    const { client, getProject } = mockClient(p);
    await dispatchTool(
      "update_scene",
      {
        projectId: p.id,
        sceneId: p.scenes[0].id,
        patch: { title: "ساخت آینده با NOVA", accent: "#06B6D4" },
      },
      client,
    );
    expect(getProject().scenes[0].title).toBe("ساخت آینده با NOVA");
  });
  it("rejects code execution and unexpected fields before any project write", async () => {
    const p = createProject();
    const { client, fetcher } = mockClient(p);
    await expect(
      dispatchTool(
        "update_scene",
        {
          projectId: p.id,
          sceneId: p.scenes[0].id,
          patch: { javascript: "process.exit()" },
        },
        client,
      ),
    ).rejects.toThrow();
    expect(
      (fetcher as any).mock.calls.some(
        (call: any[]) => call[1]?.method === "PUT",
      ),
    ).toBe(false);
  });
  it("requires explicit destructive confirmation", async () => {
    const p = createProject();
    const { client } = mockClient(p);
    await expect(
      dispatchTool("delete_project", { projectId: p.id }, client),
    ).rejects.toThrow();
    await expect(
      dispatchTool(
        "remove_layer",
        {
          projectId: p.id,
          sceneId: p.scenes[0].id,
          layerId: "unknown",
          confirm: false,
        },
        client,
      ),
    ).rejects.toThrow();
  });
  it("rejects path traversal, arbitrary service origins and remote asset URLs", async () => {
    const { client } = mockClient();
    await expect(
      dispatchTool("get_project", { projectId: "../../etc/passwd" }, client),
    ).rejects.toThrow();
    expect(() => new NovaClient(fetch, "http://169.254.169.254")).toThrow(
      "local HTTP",
    );
    const p = createProject();
    p.assets.push({
      id: "bad",
      name: "bad",
      type: "image",
      path: "http://169.254.169.254/metadata" as any,
      mime: "image/png",
      size: 100,
      tags: [],
      folder: "",
      createdAt: "",
    });
    await expect(
      dispatchTool("import_project", { project: p }, client),
    ).rejects.toThrow();
  });
  it("rejects malformed layer timing and duplicate scene IDs", async () => {
    const p = createProject();
    const { client } = mockClient(p);
    p.scenes.push(structuredClone(p.scenes[0]));
    await expect(
      dispatchTool("validate_project", { project: p }, client),
    ).rejects.toThrow();
  });
  it("converts backend failures into actionable errors", async () => {
    const client = new NovaClient(async () =>
      Response.json({ error: "Renderer unavailable" }, { status: 503 }),
    );
    await expect(dispatchTool("list_projects", {}, client)).rejects.toThrow(
      "503",
    );
  });
  it("adds a keyframe using frame-local typed data", async () => {
    const p = createProject();
    p.scenes[0].layers.push(makeLayer("text", "type", p.scenes[0].duration));
    const target = p.scenes.flatMap((s) => s.layers.map((l) => ({ s, l })))[0];
    if (!target) throw new Error("Template must include editable layer");
    const { client, getProject } = mockClient(p);
    await dispatchTool(
      "add_keyframe",
      {
        projectId: p.id,
        sceneId: target.s.id,
        layerId: target.l.id,
        keyframe: {
          id: "test-key",
          frame: 20,
          property: "scale",
          value: 1.2,
          easing: "ease-in-out",
        },
      },
      client,
    );
    expect(
      getProject()
        .scenes.find((s) => s.id === target.s.id)
        ?.layers.find((l) => l.id === target.l.id)
        ?.keyframes.some((k) => k.id === "test-key"),
    ).toBe(true);
  });
  it("rejects unknown tools and extra call arguments", async () => {
    const { client } = mockClient();
    await expect(
      dispatchTool("execute_shell", { command: "id" }, client),
    ).rejects.toThrow("Unknown NOVA tool");
    await expect(
      dispatchTool("list_projects", { command: "id" }, client),
    ).rejects.toThrow();
  });
});

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createNovaServer, createHttpApp } from "../services/mcp-server/index";

describe("MCP SDK transport and error contract", () => {
  it("performs real initialize, list_tools, resource and tool calls over linked MCP transports", async () => {
    const { client: api } = mockClient();
    const server = createNovaServer(api);
    const client = new Client({
      name: "nova-integration-test",
      version: "1.0.0",
    });
    const [left, right] = InMemoryTransport.createLinkedPair();
    await server.connect(left);
    await client.connect(right);
    try {
      const listing = await client.listTools();
      expect(listing.tools.some((t) => t.name === "create_from_template")).toBe(
        true,
      );
      const schema = await client.readResource({
        uri: "nova://schema/project",
      });
      expect(schema.contents[0].mimeType).toBe("application/schema+json");
      const created = await client.callTool({
        name: "create_project",
        arguments: { templateId: "website", name: "Created through real MCP" },
      });
      expect(created.isError).not.toBe(true);
      const bad = await client.callTool({
        name: "delete_project",
        arguments: { projectId: "missing" },
      });
      expect(bad.isError).toBe(true);
    } finally {
      await client.close();
      await server.close();
    }
  });
  it("limits a read-only server tool catalog and refuses weak HTTP credentials", async () => {
    expect(() => createHttpApp("short")).toThrow("32");
    const previous = process.env.NOVA_MCP_SCOPE;
    process.env.NOVA_MCP_SCOPE = "typo";
    try {
      expect(() =>
        createHttpApp("test-token-at-least-32-characters-long"),
      ).toThrow("read or full");
    } finally {
      if (previous === undefined) delete process.env.NOVA_MCP_SCOPE;
      else process.env.NOVA_MCP_SCOPE = previous;
    }
    const { client: api } = mockClient();
    const server = createNovaServer(api, "read");
    const client = new Client({ name: "readonly-test", version: "1.0" });
    const [left, right] = InMemoryTransport.createLinkedPair();
    await server.connect(left);
    await client.connect(right);
    try {
      const tools = await client.listTools();
      expect(tools.tools.some((t) => t.name === "list_projects")).toBe(true);
      expect(tools.tools.some((t) => t.name === "delete_project")).toBe(false);
      expect(tools.tools.some((t) => t.name === "start_render")).toBe(false);
    } finally {
      await client.close();
      await server.close();
    }
  });
});

it("authenticates actual Streamable HTTP and blocks DNS rebinding and foreign origins", async () => {
  const token = "nova-test-token-32-characters-minimum-only";
  const { client: api } = mockClient();
  const app = createHttpApp(token, api);
  const server = await new Promise<import("node:http").Server>(
    (resolve, reject) => {
      const listening = app.listen(0, "127.0.0.1", (error?: Error) =>
        error ? reject(error) : resolve(listening),
      );
      listening.once("error", reject);
    },
  );
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No test listener");
  const endpoint = `http://127.0.0.1:${address.port}/mcp`;
  try {
    expect(
      (
        await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Origin: "https://untrusted.example",
          },
          body: "{}",
        })
      ).status,
    ).toBe(403);
    const { request } = await import("node:http");
    const hostStatus = await new Promise<number>((resolve, reject) => {
      const req = request(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Host: "untrusted.example",
          },
        },
        (res) => {
          res.resume();
          res.on("end", () => resolve(res.statusCode ?? 0));
        },
      );
      req.on("error", reject);
      req.end("{}");
    });
    expect(hostStatus).toBe(403);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "http-test", version: "1.0" },
        },
      }),
    });
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.result.serverInfo.name).toBe("nova-motion-studio");
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
