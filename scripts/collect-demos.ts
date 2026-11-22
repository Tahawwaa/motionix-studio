import fs from "node:fs";
import path from "node:path";
const jobs = JSON.parse(fs.readFileSync(".nova/jobs.json", "utf8")) as Array<{
  id: string;
  status: string;
  kind: string;
  projectName: string;
  elapsedMs: number;
  project: unknown;
  metadata?: Record<string, unknown>;
}>;
const files = [
  ["01 — Website Commercial", "website-commercial"],
  ["02 — SaaS Product Commercial", "saas-product-commercial"],
  ["03 — Persian Business Reel", "persian-business-reel"],
];
const report = [];
for (const [name, file] of files) {
  const job = jobs
    .filter(
      (j) =>
        j.projectName === name &&
        j.kind === "video" &&
        j.status === "completed",
    )
    .at(-1);
  if (!job) throw new Error("No completed render for " + name);
  const input = path.resolve(".nova/outputs", job.id + ".mp4");
  const metadata = JSON.parse(
    fs.readFileSync(path.resolve(".nova/outputs", job.id + ".json"), "utf8"),
  );
  const video = metadata.streams.find(
      (s: { codec_type: string }) => s.codec_type === "video",
    ),
    audio = metadata.streams.find(
      (s: { codec_type: string }) => s.codec_type === "audio",
    );
  if (
    video?.codec_name !== "h264" ||
    video.pix_fmt !== "yuv420p" ||
    audio?.codec_name !== "aac"
  )
    throw new Error("Video contract failed for " + name);
  const output = path.resolve("examples/output", file + ".mp4");
  fs.copyFileSync(input, output);
  fs.writeFileSync(
    output + ".metadata.json",
    JSON.stringify(
      {
        ...job.metadata,
        elapsedMs: job.elapsedMs,
        verifiedSourceJob: job.id,
        ...metadata,
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.resolve("examples/output", file + ".project.json"),
    JSON.stringify(job.project, null, 2),
  );
  report.push({
    name,
    path: "examples/output/" + file + ".mp4",
    bytes: fs.statSync(output).size,
    duration: metadata.format.duration,
    pixelFormat: video.pix_fmt,
    width: video.width,
    height: video.height,
    fps: video.r_frame_rate,
    audio: audio.codec_name,
    elapsedMs: job.elapsedMs,
    jobId: job.id,
  });
}
fs.writeFileSync(
  "examples/output/verification.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
