import fs from "node:fs";
import { createHash } from "node:crypto";
import { ProjectSchema } from "../packages/project-schema";
const directory = "examples/nova-intro",
  file = directory + "/nova-intro-fa.mp4";
const job = JSON.parse(fs.readFileSync(file + ".metadata.json", "utf8"));
const p = ProjectSchema.parse(
  JSON.parse(fs.readFileSync(directory + "/project.json", "utf8")),
);
const meta = job.metadata;
const video = meta.streams.find(
    (s: { codec_type: string }) => s.codec_type === "video",
  ),
  audio = meta.streams.find(
    (s: { codec_type: string }) => s.codec_type === "audio",
  );
const hash = createHash("sha256").update(JSON.stringify(p)).digest("hex");
if (
  job.status !== "completed" ||
  video.codec_name !== "h264" ||
  audio.codec_name !== "aac" ||
  video.width !== 1080 ||
  video.height !== 1920 ||
  video.pix_fmt !== "yuv420p" ||
  video.r_frame_rate !== "30/1" ||
  Number(video.nb_frames) !== 900 ||
  job.projectHash !== hash
)
  throw new Error("Final media failed the expected video contract");
const report = {
  projectId: p.id,
  projectName: p.name,
  sourceHash: hash,
  jobId: job.id,
  frames: 900,
  videoDuration: Number(video.duration),
  containerDuration: Number(meta.format.duration),
  resolution: "1080x1920",
  fps: 30,
  videoCodec: video.codec_name,
  audioCodec: audio.codec_name,
  pixelFormat: video.pix_fmt,
  bytes: fs.statSync(file).size,
  renderElapsedMs: job.elapsedMs,
  originalScreenshots: 5,
  reviewedSceneFrames: 7,
  narration: false,
  originalMusic: true,
  portableProject: directory + "/nova-intro-project.zip",
  sha256: createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
};
fs.writeFileSync(
  directory + "/verification.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
