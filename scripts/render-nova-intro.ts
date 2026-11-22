import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ProjectSchema } from "../packages/project-schema";
const directory = path.resolve("examples/nova-intro"),
  project = ProjectSchema.parse(
    JSON.parse(fs.readFileSync(path.join(directory, "project.json"), "utf8")),
  );
const base = "http://127.0.0.1:8001";
const headers: Record<string, string> = {
  "Content-Type": "application/json",
  ...(process.env.NOVA_API_TOKEN
    ? { Authorization: `Bearer ${process.env.NOVA_API_TOKEN}` }
    : {}),
};
type Job = {
  id: string;
  status: string;
  progress: number;
  error?: string;
  output?: string;
  thumbnail?: string;
  elapsedMs?: number;
  metadata?: Record<string, unknown>;
};
async function request(endpoint: string, body?: unknown): Promise<Job> {
  const r = await fetch(base + endpoint, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j));
  return j;
}
async function wait(id: string) {
  let previous = -1;
  for (let i = 0; i < 1800; i++) {
    const job = await request("/worker/jobs/" + id);
    const n = Math.floor(job.progress * 20) * 5;
    if (n !== previous) {
      console.log(`${id}: ${job.status} ${n}%`);
      previous = n;
    }
    if (job.status === "completed") return job;
    if (job.status === "failed" || job.status === "cancelled")
      throw new Error(job.error ?? job.status);
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Render exceeded30minute wait");
}
async function download(url: string, file: string) {
  if (!/^\/worker\/outputs\/[a-f0-9-]+(?:-thumb)?\.(?:png|mp4|json)$/.test(url))
    throw new Error("Unexpected generated output path");
  const r = await fetch(base + url, { headers });
  if (!r.ok) throw new Error("Output download failed");
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}
if (process.argv.includes("--review")) {
  fs.mkdirSync(path.join(directory, "frames"), { recursive: true });
  const jobs: Job[] = [];
  for (const scene of project.scenes)
    jobs.push(
      await request("/worker/frame", {
        project,
        preset: "draft",
        frame: scene.startFrame + Math.round(scene.duration * 0.52),
      }),
    );
  fs.writeFileSync(
    path.join(directory, "frame-jobs.json"),
    JSON.stringify(
      jobs.map((j) => j.id),
      null,
      2,
    ),
  );
  const thumbs: Buffer[] = [];
  for (let i = 0; i < jobs.length; i++) {
    const job = await wait(jobs[i].id);
    const file = path.join(
      directory,
      "frames",
      `scene-${String(i + 1).padStart(2, "0")}.png`,
    );
    await download(job.output!, file);
    thumbs.push(await sharp(file).resize(270, 480).png().toBuffer());
  }
  await sharp({
    create: {
      width: 810,
      height: Math.ceil(thumbs.length / 3) * 480,
      channels: 4,
      background: "#09090B",
    },
  })
    .composite(
      thumbs.map((input, i) => ({
        input,
        left: (i % 3) * 270,
        top: Math.floor(i / 3) * 480,
      })),
    )
    .png()
    .toFile(path.join(directory, "contact-sheet.png"));
  console.log("Review frames and contact sheet saved.");
}
if (process.argv.includes("--final") || process.argv.includes("--draft")) {
  const draft = process.argv.includes("--draft");
  const queued = await request("/worker/jobs", {
    project,
    preset: draft ? "draft" : "instagram",
    format: "mp4",
  });
  fs.writeFileSync(
    path.join(directory, draft ? "draft-job.json" : "final-job.json"),
    JSON.stringify(queued, null, 2),
  );
  const done = await wait(queued.id);
  const output = path.join(
    directory,
    draft ? "nova-intro-fa-draft.mp4" : "nova-intro-fa.mp4",
  );
  await download(done.output!, output);
  fs.writeFileSync(output + ".metadata.json", JSON.stringify(done, null, 2));
  if (done.thumbnail)
    await download(done.thumbnail, path.join(directory, "thumbnail.png"));
  console.log(
    JSON.stringify(
      {
        output,
        bytes: fs.statSync(output).size,
        elapsedMs: done.elapsedMs,
        metadata: done.metadata,
      },
      null,
      2,
    ),
  );
}
