import fs from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import {
  ProjectSchema,
  type Project,
} from "../../packages/project-schema/index";
export type JobStatus =
  "queued" | "rendering" | "completed" | "failed" | "cancelled";
export type RenderPreset = "draft" | "instagram" | "high" | "4k";
export type RenderJob = {
  id: string;
  kind: "video" | "frame" | "contact-sheet";
  status: JobStatus;
  progress: number;
  logs: string[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  projectId: string;
  projectName: string;
  projectHash: string;
  project: Project;
  preset: RenderPreset;
  format: "mp4" | "webm" | "png";
  frame?: number;
  output?: string;
  thumbnail?: string;
  error?: string;
  metadata?: Record<string, unknown>;
  elapsedMs?: number;
};
export type JobContext = {
  update: (progress: number, message?: string) => void;
  isCancelled: () => boolean;
  setCancel: (fn: () => void) => void;
};
export type JobRunner = (
  job: RenderJob,
  context: JobContext,
) => Promise<Pick<RenderJob, "output" | "thumbnail" | "metadata">>;
export class RenderQueue {
  jobs: RenderJob[] = [];
  private active = false;
  private cancellations = new Map<string, () => void>();
  private cancelled = new Set<string>();
  private file: string;
  constructor(
    private directory: string,
    private runner: JobRunner,
    private maxPending = 12,
  ) {
    fs.mkdirSync(directory, { recursive: true });
    this.file = path.join(directory, "jobs.json");
    if (fs.existsSync(this.file)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.file, "utf8"));
        this.jobs = Array.isArray(data) ? data.slice(-200) : [];
      } catch {
        this.jobs = [];
      }
    }
    for (const j of this.jobs)
      if (j.status === "rendering" || j.status === "queued") {
        j.status = "failed";
        j.error =
          "Worker restarted before this render completed. Retry to resume.";
        j.logs.push(j.error);
      }
    this.save();
  }
  private save() {
    const tmp = this.file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(this.jobs));
    fs.renameSync(tmp, this.file);
  }
  list() {
    return this.jobs
      .slice()
      .reverse()
      .map((j) => this.publicJob(j));
  }
  publicJob(j: RenderJob) {
    const { project, ...publicFields } = j;
    return publicFields;
  }
  get(id: string) {
    return this.jobs.find((j) => j.id === id);
  }
  enqueue(input: {
    project: Project;
    kind?: RenderJob["kind"];
    preset?: RenderPreset;
    format?: RenderJob["format"];
    frame?: number;
  }) {
    if (
      this.jobs.filter((j) => j.status === "queued" || j.status === "rendering")
        .length >= this.maxPending
    )
      throw new Error("Render queue is full. Wait for a job to finish.");
    const project = ProjectSchema.parse(input.project);
    const j: RenderJob = {
      id: randomUUID(),
      kind: input.kind || "video",
      status: "queued",
      progress: 0,
      logs: ["Queued for the local renderer."],
      createdAt: new Date().toISOString(),
      projectId: project.id,
      projectName: project.name,
      projectHash: createHash("sha256")
        .update(JSON.stringify(project))
        .digest("hex"),
      project,
      preset: input.preset || "instagram",
      format:
        input.kind && input.kind !== "video" ? "png" : input.format || "mp4",
      frame: input.frame,
    };
    this.jobs.push(j);
    this.save();
    void this.pump();
    return j;
  }
  cancel(id: string) {
    const j = this.get(id);
    if (!j) throw new Error("Render not found");
    if (!["queued", "rendering"].includes(j.status))
      throw new Error("Only queued or active renders can be cancelled");
    this.cancelled.add(id);
    this.cancellations.get(id)?.();
    j.status = "cancelled";
    j.completedAt = new Date().toISOString();
    j.logs.push("Cancelled by user.");
    this.save();
    return j;
  }
  retry(id: string) {
    const j = this.get(id);
    if (!j) throw new Error("Render not found");
    if (!["failed", "cancelled"].includes(j.status))
      throw new Error("Only failed or cancelled jobs can be retried");
    return this.enqueue({
      project: j.project,
      kind: j.kind,
      preset: j.preset,
      format: j.format,
      frame: j.frame,
    });
  }
  private async pump() {
    if (this.active) return;
    const job = this.jobs.find((j) => j.status === "queued");
    if (!job) return;
    this.active = true;
    job.status = "rendering";
    job.startedAt = new Date().toISOString();
    this.save();
    const began = Date.now();
    try {
      const result = await this.runner(job, {
        isCancelled: () => this.cancelled.has(job.id),
        setCancel: (fn) => this.cancellations.set(job.id, fn),
        update: (progress, message) => {
          if (this.cancelled.has(job.id)) return;
          job.progress = Math.max(job.progress, Math.min(0.99, progress));
          if (message) job.logs.push(message);
          job.logs = job.logs.slice(-100);
          this.save();
        },
      });
      if (!this.cancelled.has(job.id)) {
        Object.assign(job, result);
        job.status = "completed";
        job.progress = 1;
        job.logs.push("Output verified and ready to download.");
      }
    } catch (error) {
      if (!this.cancelled.has(job.id)) {
        job.status = "failed";
        job.error = error instanceof Error ? error.message : String(error);
        job.logs.push(job.error);
      }
    } finally {
      job.elapsedMs = Date.now() - began;
      job.completedAt = new Date().toISOString();
      this.cancellations.delete(job.id);
      this.cancelled.delete(job.id);
      this.active = false;
      this.save();
      void this.pump();
    }
  }
}
