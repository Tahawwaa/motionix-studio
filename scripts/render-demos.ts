import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { demoProjects } from "../packages/templates/index";
import {
  LayerSchema,
  ProjectSchema,
  uid,
  type Asset,
  type Project,
} from "../packages/project-schema/index";
import { seeded } from "../packages/video-engine/motion";
const root = process.cwd(),
  directory = path.join(root, "examples/output");
fs.mkdirSync(directory, { recursive: true });
const api = process.env.NOVA_BACKEND_URL || "http://127.0.0.1:8000";
const worker = process.env.NOVA_WORKER_URL || "http://127.0.0.1:8001";
const token = process.env.NOVA_API_TOKEN;
const headers: Record<string, string> = {
  Accept: "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};
async function json(url: string, body?: unknown) {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      ...headers,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(result));
  return result;
}
function originalScore(seconds: number) {
  const rate = 22050,
    n = seconds * rate,
    data = Buffer.alloc(44 + n * 2);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + n * 2, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24);
  data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const t = i / rate,
      fade = Math.min(1, t / 2, (seconds - t) / 3),
      beat = t % 2;
    const pad =
      (Math.sin(2 * Math.PI * 110 * t) +
        0.45 * Math.sin(2 * Math.PI * 165 * t) +
        0.2 * Math.sin(2 * Math.PI * 220 * t)) *
      0.065;
    const hit =
      Math.sin(2 * Math.PI * (65 - 20 * beat) * beat) *
      Math.exp(-beat * 15) *
      0.09;
    const tick = (seeded(i) - 0.5) * Math.exp(-(t % 0.5) * 90) * 0.022;
    data.writeInt16LE(
      Math.max(
        -32767,
        Math.min(32767, Math.round((pad + hit + tick) * fade * 32767)),
      ),
      44 + i * 2,
    );
  }
  return data;
}
const wav = originalScore(30);
fs.writeFileSync(path.join(directory, "nova-original-score.wav"), wav);
const existingAssets: Asset[] = await json(`${api}/api/assets`);
let asset = existingAssets.find(
  (a) => a.name === "nova-original-score.wav" && a.size === wav.length,
);
if (!asset) {
  const form = new FormData();
  form.append(
    "file",
    new Blob([wav], { type: "audio/wav" }),
    "nova-original-score.wav",
  );
  const upload = await fetch(`${api}/api/assets`, {
    method: "POST",
    headers,
    body: form,
  });
  const payload = await upload.json();
  if (!upload.ok)
    throw new Error(
      `Could not upload original sound design: ${JSON.stringify(payload)}`,
    );
  asset = payload.asset || payload;
}
if (!asset) throw new Error("Original sound design asset unavailable");
for (const [index, initial] of demoProjects().entries()) {
  const slug = [
    "website-commercial",
    "saas-product-commercial",
    "persian-business-reel",
  ][index];
  const sourceFile = path.join(directory, `${slug}.project.json`);
  const stored = fs.existsSync(sourceFile);
  const project = stored
    ? ProjectSchema.parse(JSON.parse(fs.readFileSync(sourceFile, "utf8")))
    : initial;
  if (!stored) {
    project.assets.push(asset);
    project.scenes[1].type = "orbit";
    project.scenes[1].camera.path = "orbit";
    project.scenes[1].effects.push("light-sweep");
    for (const scene of project.scenes)
      scene.layers.push(
        LayerSchema.parse({
          id: uid(),
          name: "Original ambient score",
          type: "audio",
          trackId: "sound",
          startFrame: 0,
          duration: scene.duration,
          assetId: asset.id,
          trimStart: scene.startFrame,
          volume: 0.7,
          animation: "none",
        }),
      );
    Object.assign(project, await json(`${api}/api/projects`, project));
    fs.writeFileSync(sourceFile, JSON.stringify(project, null, 2));
  }
  console.log(`Rendering ${project.name}`);
  async function run(
    endpoint: string,
    body: Record<string, unknown>,
    filename: string,
  ) {
    const hash = createHash("sha256")
      .update(JSON.stringify(body.project))
      .digest("hex");
    const jobs = await json(`${worker}/worker/jobs`);
    const kind = endpoint === "jobs" ? "video" : endpoint;
    const reusable = jobs.find(
      (j: {
        kind: string;
        status: string;
        projectHash: string;
        preset: string;
        frame?: number;
        metadata?: {
          contactSheetLayoutVersion?: number;
          streams?: { codec_type: string; pix_fmt?: string }[];
        };
      }) =>
        j.kind === kind &&
        j.status === "completed" &&
        j.projectHash === hash &&
        j.preset === body.preset &&
        (kind !== "video" ||
          j.metadata?.streams?.some(
            (s) => s.codec_type === "video" && s.pix_fmt === "yuv420p",
          )) &&
        (kind !== "contact-sheet" ||
          j.metadata?.contactSheetLayoutVersion === 2) &&
        (body.frame === undefined || j.frame === body.frame),
    );
    const started =
      reusable || (await json(`${worker}/worker/${endpoint}`, body));
    const until = Date.now() + 60 * 60 * 1000;
    let last = "";
    while (Date.now() < until) {
      const job = await json(`${worker}/worker/jobs/${started.id}`);
      const progress = `${job.status} ${Math.round(job.progress * 100)}%`;
      if (progress !== last) {
        console.log(`${filename}: ${progress}`);
        last = progress;
      }
      if (job.status === "failed" || job.status === "cancelled")
        throw new Error(job.error || job.logs.join("\n"));
      if (job.status === "completed") {
        const response = await fetch(`${worker}${job.output}`, { headers });
        if (!response.ok) throw new Error("Output download failed");
        fs.writeFileSync(
          path.join(directory, filename),
          Buffer.from(await response.arrayBuffer()),
        );
        fs.writeFileSync(
          path.join(directory, `${filename}.metadata.json`),
          JSON.stringify(job, null, 2),
        );
        return job;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error("Demo render timed out");
  }
  await run(
    "jobs",
    { project, preset: process.env.NOVA_DEMO_PRESET || "draft", format: "mp4" },
    `${slug}.mp4`,
  );
  await run("frame", { project, preset: "draft", frame: 60 }, `${slug}.png`);
  await run(
    "contact-sheet",
    { project, preset: "draft" },
    `${slug}-contact-sheet.png`,
  );
}
console.log(`Rendered and verified all three demos in ${directory}`);
