import express from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import {
  ProjectSchema,
  projectWarnings,
  animations,
  effectTypes,
  sceneTypes,
  durationOf,
} from "../../packages/project-schema/index";
import { templates } from "../../packages/templates/index";
import { RenderQueue } from "./queue";
import {
  runRender,
  outputDirectory,
  browserExecutable,
  limits,
} from "./render";
export const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  const host = req.hostname;
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)) {
    res.status(403).json({ error: "Localhost access only" });
    return;
  }
  const origin = req.headers.origin;
  if (
    origin &&
    ![
      "http://127.0.0.1:5173",
      "http://localhost:5173",
      "http://127.0.0.1:8000",
      "http://localhost:8000",
      "http://127.0.0.1:8001",
      "http://localhost:8001",
    ].includes(origin)
  ) {
    res.status(403).json({ error: "Untrusted origin" });
    return;
  }
  if (
    process.env.NOVA_API_TOKEN &&
    req.headers.authorization !== `Bearer ${process.env.NOVA_API_TOKEN}` &&
    !origin
  ) {
    res.status(401).json({ error: "Bearer token required" });
    return;
  }
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(express.json({ limit: "5mb" }));
export const queue = new RenderQueue(
  path.join(process.cwd(), ".nova"),
  runRender,
  limits.maxQueued,
);
const enqueueSchema = z
  .object({
    project: ProjectSchema,
    preset: z.enum(["draft", "instagram", "high", "4k"]).optional(),
    format: z.enum(["mp4", "webm", "png"]).optional(),
    frame: z.number().int().nonnegative().optional(),
  })
  .strict();
const limited = new Map<string, { count: number; start: number }>();
app.use("/worker", (req, res, next) => {
  if (req.method === "GET") {
    next();
    return;
  }
  const id = req.ip || "local";
  const now = Date.now();
  let v = limited.get(id);
  if (!v || now - v.start > 60000) {
    v = { count: 0, start: now };
    limited.set(id, v);
  }
  if (++v.count > 120) {
    res.status(429).json({
      error: "Local write rate limit reached. Try again in a minute.",
    });
    return;
  }
  next();
});
app.get("/worker/health", (_req, res) =>
  res.json({
    ok: true,
    renderer: "remotion",
    browserAvailable: !!browserExecutable,
    gpu: "unverified",
    hardwareEncoding: false,
    queue: {
      active: queue.jobs.filter((j) => j.status === "rendering").length,
      pending: queue.jobs.filter((j) => j.status === "queued").length,
    },
    limits,
    platform: os.platform(),
    memoryGB: Math.round(os.totalmem() / 1024 ** 3),
    formats: ["mp4", "webm", "png"],
    capabilities: {
      three: true,
      contactSheets: true,
      frameRendering: true,
      hardwareEncoding: false,
    },
  }),
);
app.post("/worker/validate", (req, res) => {
  const project = ProjectSchema.parse(req.body.project ?? req.body);
  res.json({ valid: true, project, warnings: projectWarnings(project) });
});
app.get("/worker/schema", (_req, res) =>
  res.json(z.toJSONSchema(ProjectSchema, { io: "input" })),
);
app.get("/worker/catalog", (_req, res) =>
  res.json({ scenes: sceneTypes, animations, effects: effectTypes, templates }),
);
app.get("/worker/jobs", (_req, res) => res.json(queue.list()));
function enqueue(kind: "video" | "frame" | "contact-sheet") {
  return (req: express.Request, res: express.Response) => {
    const input = enqueueSchema.parse(req.body);
    const project = input.project;
    if (kind === "video" && input.format === "png")
      throw new Error("Use the frame endpoint for PNG output");
    if (project.width * project.height > limits.maxPixels)
      throw new Error("Resolution exceeds local rendering limits");
    const job = queue.enqueue({ ...input, kind });
    res.status(202).json(queue.publicJob(job));
  };
}
app.post("/worker/jobs", enqueue("video"));
app.post("/worker/frame", enqueue("frame"));
app.post("/worker/contact-sheet", enqueue("contact-sheet"));
app.get("/worker/jobs/:id", (req, res) => {
  const job = queue.get(req.params.id as string);
  if (!job) {
    res.status(404).json({ error: "Render not found" });
    return;
  }
  res.json(queue.publicJob(job));
});
app.post("/worker/jobs/:id/cancel", (req, res) =>
  res.json(queue.publicJob(queue.cancel(req.params.id as string))),
);
app.post("/worker/jobs/:id/retry", (req, res) =>
  res.status(202).json(queue.publicJob(queue.retry(req.params.id as string))),
);
app.get("/worker/outputs/:file", (req, res) => {
  const file = req.params.file as string;
  if (!/^[a-f0-9-]{36}(-thumb)?\.(mp4|webm|png|json)$/.test(file)) {
    res.status(404).end();
    return;
  }
  const id = file.slice(0, 36);
  const job = queue.get(id);
  if (!job || job.status !== "completed") {
    res.status(404).end();
    return;
  }
  const absolute = path.join(outputDirectory, file);
  if (!fs.existsSync(absolute)) {
    res.status(404).end();
    return;
  }
  res.sendFile(absolute, { dotfiles: "allow" });
});
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof z.ZodError) {
      res.status(422).json({
        error: "Project or render options failed validation",
        issues: error.issues,
      });
      return;
    }
    res.status(400).json({
      error: error instanceof Error ? error.message : "Invalid render request",
    });
  },
);
const port = Number(process.env.NOVA_WORKER_PORT) || 8001;
app.listen(port, "127.0.0.1", () =>
  console.log(`NOVA render worker: http://127.0.0.1:${port}`),
);
