import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  renderStill,
  selectComposition,
  makeCancelSignal,
} from "@remotion/renderer";
import sharp from "sharp";
import ffprobe from "ffprobe-static";
import {
  durationOf,
  projectWarnings,
  type Project,
} from "../../packages/project-schema/index";
import type { RenderJob, JobContext, RenderPreset } from "./queue";
import { readFrameConcurrency, resolveFrameConcurrency } from "./config";
const exec = promisify(execFile);
export const root = process.cwd();
export const outputDirectory = path.join(root, ".nova", "outputs");
export const limits = {
  renderConcurrency: resolveFrameConcurrency(null),
  maxQueued: 12,
  maxDurationSeconds: 1800,
  maxPixels: 3840 * 3840,
  maxPreviewDimension: 960,
};
export const browserExecutable =
  process.env.NOVA_CHROME_PATH ||
  [
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ].find((x) => fs.existsSync(x)) ||
  null;
let bundlePromise: Promise<string> | null = null;
let bundledVersion = "";
export function getBundle(update?: (n: number) => void) {
  const version = [
    "packages/video-engine/index.tsx",
    "packages/video-engine/motion.ts",
    "packages/video-engine/remotion.tsx",
    "packages/project-schema/index.ts",
    "packages/templates/index.ts",
  ]
    .map((f) => fs.statSync(path.join(root, f)).mtimeMs)
    .join(":");
  if (version !== bundledVersion) {
    bundlePromise = null;
    bundledVersion = version;
  }
  if (!bundlePromise)
    bundlePromise = bundle({
      entryPoint: path.join(root, "packages/video-engine/remotion.tsx"),
      publicDir: path.join(root, "public"),
      outDir: path.join(root, ".nova/bundle"),
      onProgress: (p) => update?.(p),
    }).catch((e) => {
      bundlePromise = null;
      throw e;
    });
  return bundlePromise;
}
export function applyPreset(source: Project, preset: RenderPreset): Project {
  const p = structuredClone(source);
  let target = p.width;
  if (preset === "draft") target = p.width > p.height ? 960 : 540;
  if (preset === "instagram") target = p.width > p.height ? 1920 : 1080;
  if (preset === "4k") target = p.width > p.height ? 3840 : 2160;
  const scale = target / p.width;
  p.width = Math.round((p.width * scale) / 2) * 2;
  p.height = Math.round((p.height * scale) / 2) * 2;
  if (p.width > 3840 || p.height > 3840) {
    const shrink = 3840 / Math.max(p.width, p.height);
    p.width = Math.round((p.width * shrink) / 2) * 2;
    p.height = Math.round((p.height * shrink) / 2) * 2;
  }
  return p;
}
export async function inspectMedia(file: string) {
  const { stdout } = await exec(
    ffprobe.path,
    ["-v", "error", "-show_format", "-show_streams", "-of", "json", file],
    { timeout: 30000, maxBuffer: 5_000_000 },
  );
  const meta = JSON.parse(stdout) as {
    streams: {
      codec_type: string;
      width?: number;
      height?: number;
      codec_name?: string;
      duration?: string;
      avg_frame_rate?: string;
      pix_fmt?: string;
    }[];
    format: Record<string, unknown>;
  };
  if (!meta.streams.some((s) => s.codec_type === "video"))
    throw new Error("Output has no video stream");
  return { streams: meta.streams, format: meta.format };
}
async function executeRender(job: RenderJob, ctx: JobContext) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const warnings = projectWarnings(job.project);
  const fonts = new Set(
    job.project.assets.filter((a) => a.type === "font").map((a) => a.id),
  );
  const missingFonts = job.project.scenes.flatMap((s) =>
    s.layers
      .filter(
        (l) =>
          l.fontFamily.startsWith("asset:") &&
          !fonts.has(l.fontFamily.slice(6)),
      )
      .map((l) => `Missing local font for ${l.name}`),
  );
  const missing = [
    ...warnings.filter((w) => w.includes("missing asset")),
    ...missingFonts,
  ];
  if (missing.length) throw new Error(missing.join("; "));
  const concurrency = await readFrameConcurrency();
  limits.renderConcurrency = concurrency;
  ctx.update(
    0,
    `Preparing the shared Remotion composition with ${concurrency} frame worker${concurrency === 1 ? "" : "s"}.`,
  );
  const serveUrl = await getBundle((p) => ctx.update((p / 100) * 0.05));
  if (ctx.isCancelled()) throw new Error("Cancelled");
  const project = applyPreset(job.project, job.preset);
  if (job.kind !== "video") {
    const factor = Math.min(1, 960 / Math.max(project.width, project.height));
    project.width = Math.round((project.width * factor) / 2) * 2;
    project.height = Math.round((project.height * factor) / 2) * 2;
  }
  const inputProps = {
    project,
    assetBaseUrl: "http://127.0.0.1:8000",
    enable3D: true,
  };
  const chromiumOptions = {
    gl: "angle" as const,
    enableMultiProcessOnLinux: true,
  };
  const composition = await selectComposition({
    serveUrl,
    id: "Nova",
    inputProps,
    browserExecutable,
    chromiumOptions,
    timeoutInMilliseconds: 120000,
  });
  if (ctx.isCancelled()) throw new Error("Cancelled");
  ctx.update(
    0.06,
    `Composition ready: ${project.width} × ${project.height}, ${project.fps} fps, ${durationOf(project)} frames.`,
  );
  const ext =
    job.kind === "video" ? (job.format === "webm" ? "webm" : "mp4") : "png";
  const output = path.join(outputDirectory, `${job.id}.${ext}`);
  const common = {
    serveUrl,
    composition,
    inputProps,
    browserExecutable,
    chromiumOptions,
    timeoutInMilliseconds: 120000,
    logLevel: "warn" as const,
  };
  let metadata: Record<string, unknown> = {
    projectHash: job.projectHash,
    sourceWidth: job.project.width,
    sourceHeight: job.project.height,
    width: project.width,
    height: project.height,
    fps: project.fps,
    frames: durationOf(project),
    preset: job.preset,
    frameConcurrency: concurrency,
    renderer: "Remotion",
    rendererVersion: "nova/0.1.0",
    engineSourceHash: createHash("sha256")
      .update(
        fs.readFileSync(path.join(root, "packages/video-engine/index.tsx")),
      )
      .digest("hex"),
    hardwareEncoding: false,
  };
  if (job.kind === "video") {
    const cancel = makeCancelSignal();
    ctx.setCancel(cancel.cancel);
    await renderMedia({
      ...common,
      codec: job.format === "webm" ? "vp8" : "h264",
      outputLocation: output,
      concurrency,
      crf: job.preset === "draft" ? 28 : job.preset === "high" ? 16 : 20,
      pixelFormat: "yuv420p",
      colorSpace: "bt709",
      imageFormat: "png",
      audioCodec: job.format === "webm" ? "opus" : "aac",
      enforceAudioTrack: true,
      cancelSignal: cancel.cancelSignal,
      onProgress: (p) => ctx.update(0.07 + p.progress * 0.88),
      ffmpegOverride: ({ args }) =>
        job.format === "webm"
          ? args
          : [
              ...args.slice(0, -1),
              "-movflags",
              "+faststart",
              args[args.length - 1],
            ],
      metadata: {
        comment: `NOVA project ${job.project.id}; sha256 ${job.projectHash}`,
      },
    });
    ctx.update(0.96, "Encoding finished. Verifying the output with FFprobe.");
    const media = await inspectMedia(output);
    metadata = { ...metadata, ...media };
    const video = media.streams.find((s) => s.codec_type === "video")!;
    const audio = media.streams.find((s) => s.codec_type === "audio");
    if (!audio) throw new Error("Output is missing its audio track");
    if (video.width !== project.width || video.height !== project.height)
      throw new Error("Encoded output dimensions do not match the composition");
    if (
      job.format !== "webm" &&
      (video.codec_name !== "h264" ||
        audio.codec_name !== "aac" ||
        video.pix_fmt !== "yuv420p")
    )
      throw new Error(
        "Encoded output does not match the H.264/AAC/yuv420p export contract",
      );
    const fraction = video.avg_frame_rate?.split("/").map(Number);
    if (fraction && Math.abs(fraction[0] / fraction[1] - project.fps) > 0.01)
      throw new Error(
        "Encoded output frame rate does not match the composition",
      );
    if (
      Math.abs(
        Number(media.format.duration) - durationOf(project) / project.fps,
      ) > 0.25
    )
      throw new Error("Encoded output duration does not match the timeline");
  } else if (job.kind === "frame") {
    const frame = Math.max(
      0,
      Math.min(
        durationOf(project) - 1,
        job.frame ?? Math.round(durationOf(project) * 0.15),
      ),
    );
    await renderStill({ ...common, frame, output, imageFormat: "png" });
    metadata.frame = frame;
    ctx.update(0.96, `Rendered frame ${frame}.`);
  } else {
    const sampledScenes =
      project.scenes.length <= 3
        ? project.scenes
        : [
            project.scenes[0],
            project.scenes[Math.floor(project.scenes.length / 2)],
            project.scenes[project.scenes.length - 1],
          ];
    const frames = sampledScenes.flatMap((s) =>
      (sampledScenes.length === 1 ? [0.25, 0.5, 0.75] : [0.3, 0.7]).map((t) =>
        Math.min(
          durationOf(project) - 1,
          s.startFrame + Math.round(s.duration * t),
        ),
      ),
    );
    const count = frames.length;
    const buffers: Buffer[] = [];
    for (let i = 0; i < frames.length; i++) {
      if (ctx.isCancelled()) throw new Error("Cancelled");
      const result = await renderStill({
        ...common,
        frame: frames[i],
        imageFormat: "png",
      });
      buffers.push(result.buffer!);
      ctx.update(
        0.07 + ((i + 1) / count) * 0.85,
        `Contact sheet: frame ${frames[i]} (${i + 1}/${count}).`,
      );
    }
    const thumbWidth = 270,
      thumbHeight = Math.round((project.height / project.width) * thumbWidth);
    const columns = 3;
    const thumbs = await Promise.all(
      buffers.map((b) =>
        sharp(b).resize(thumbWidth, thumbHeight).png().toBuffer(),
      ),
    );
    await sharp({
      create: {
        width: columns * thumbWidth,
        height: Math.ceil(count / columns) * thumbHeight,
        channels: 4,
        background: "#09090b",
      },
    })
      .composite(
        thumbs.map((input, i) => ({
          input,
          left: (i % columns) * thumbWidth,
          top: Math.floor(i / columns) * thumbHeight,
        })),
      )
      .png()
      .toFile(output);
    metadata.frames = frames;
    metadata.contactSheetLayoutVersion = 2;
  }
  if (ctx.isCancelled()) {
    fs.rmSync(output, { force: true });
    throw new Error("Cancelled");
  }
  if (fs.statSync(output).size < 100) throw new Error("Output file is empty");
  let thumbnail: string | undefined;
  if (job.kind === "video") {
    const thumbnailPath = path.join(outputDirectory, `${job.id}-thumb.png`);
    await renderStill({
      ...common,
      frame: Math.min(durationOf(project) - 1, Math.round(project.fps * 2)),
      output: thumbnailPath,
      imageFormat: "png",
      scale: Math.min(1, 360 / project.width),
    });
    thumbnail = `/worker/outputs/${job.id}-thumb.png`;
  }
  fs.writeFileSync(
    path.join(outputDirectory, `${job.id}.json`),
    JSON.stringify(metadata, null, 2),
  );
  return { output: `/worker/outputs/${job.id}.${ext}`, thumbnail, metadata };
}

export async function runRender(job: RenderJob, ctx: JobContext) {
  try {
    return await executeRender(job, ctx);
  } catch (error) {
    for (const suffix of [".mp4", ".webm", ".png", "-thumb.png", ".json"])
      fs.rmSync(path.join(outputDirectory, job.id + suffix), { force: true });
    throw error;
  }
}
