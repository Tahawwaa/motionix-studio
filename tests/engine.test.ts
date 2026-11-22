import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  cameraPosition,
  ease,
  keyframeValue,
  seeded,
} from "../packages/video-engine/motion";
import {
  createProject,
  templates,
  demoProjects,
} from "../packages/templates/index";
import {
  ProjectSchema,
  durationOf,
  projectWarnings,
} from "../packages/project-schema/index";
import { resolveFrameConcurrency } from "../services/render-worker/config";
import { RenderQueue } from "../services/render-worker/queue";
describe("cinematic engine", () => {
  it("uses persisted frame concurrency unless the environment overrides it", () => {
    expect(resolveFrameConcurrency({ concurrency: 3 }, "")).toBe(3);
    expect(resolveFrameConcurrency({ concurrency: 3 }, "1")).toBe(1);
    expect(resolveFrameConcurrency({ concurrency: 99 }, "")).toBe(4);
    expect(resolveFrameConcurrency({ concurrency: 0 }, "")).toBe(1);
    expect(resolveFrameConcurrency(null, "")).toBe(2);
  });
  it("produces distinct valid editable templates", () => {
    expect(templates).toHaveLength(12);
    expect(new Set(templates.map((t) => t.type)).size).toBe(12);
    for (const t of templates) {
      const p = createProject(t.id);
      expect(ProjectSchema.safeParse(p).success).toBe(true);
      expect(durationOf(p)).toBe(t.duration * 30);
    }
  });
  it("has real requested demo durations and Persian content", () => {
    const p = demoProjects();
    expect(p.map(durationOf)).toEqual([600, 900, 540]);
    expect(p[2].scenes[0].title).toMatch(/[\u0600-\u06FF]/);
  });
  it("interpolates frame positions and clamps before/after", () => {
    const keys = [
      {
        id: "a",
        property: "x" as const,
        frame: 0,
        value: 10,
        easing: "linear" as const,
      },
      {
        id: "b",
        property: "x" as const,
        frame: 100,
        value: 90,
        easing: "linear" as const,
      },
    ];
    expect(keyframeValue(keys, "x", 50, 0)).toBe(50);
    expect(keyframeValue(keys, "x", 200, 0)).toBe(90);
    expect(keyframeValue(keys, "opacity", 50, 0.5)).toBe(0.5);
  });
  it("uses repeatable noise and camera motion", () => {
    expect(seeded(12)).toBe(seeded(12));
    expect(cameraPosition("orbit", 45, 180)).toEqual(
      cameraPosition("orbit", 45, 180),
    );
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
  });
  it("flags missing assets", () => {
    const p = createProject();
    p.scenes[0].layers.push({
      id: "missing",
      name: "Missing",
      type: "image",
      trackId: "media",
      startFrame: 0,
      duration: 10,
      x: 50,
      y: 50,
      width: 80,
      height: 50,
      rotation: 0,
      scale: 1,
      opacity: 1,
      zIndex: 1,
      text: "",
      assetId: "x",
      color: "#fff",
      fontSize: 80,
      fontFamily: "Inter",
      fontWeight: 600,
      direction: "auto",
      align: "center",
      animation: "fade",
      keyframes: [],
      volume: 1,
      trimStart: 0,
      visible: true,
    });
    expect(projectWarnings(p).join()).toContain("missing asset");
  });
});
describe("persistent render queue", () => {
  it("executes asynchronously and preserves verified result", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nova-queue-"));
    const q = new RenderQueue(dir, async (_j, c) => {
      c.update(0.5, "Frame rendering");
      return { output: "/worker/outputs/result.mp4" };
    });
    const j = q.enqueue({ project: createProject() });
    expect(j.status).toBe("rendering");
    await new Promise((r) => setTimeout(r, 20));
    expect(j.status).toBe("completed");
    expect(j.progress).toBe(1);
    expect(new RenderQueue(dir, async () => ({})).get(j.id)?.output).toContain(
      "result.mp4",
    );
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it("cancels active jobs and retries with a new real id", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nova-cancel-"));
    let finish: () => void = () => {};
    const q = new RenderQueue(dir, async (_j, c) => {
      await new Promise<void>((r) => {
        finish = r;
        c.setCancel(r);
      });
      return { output: "never" };
    });
    const j = q.enqueue({ project: createProject() });
    q.cancel(j.id);
    await new Promise((r) => setTimeout(r, 10));
    expect(j.status).toBe("cancelled");
    expect(j.output).toBeUndefined();
    const retried = q.retry(j.id);
    expect(retried.id).not.toBe(j.id);
    finish();
    await new Promise((r) => setTimeout(r, 10));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it("rejects invalid projects before queuing", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nova-invalid-"));
    const q = new RenderQueue(dir, async () => ({}));
    const p = createProject();
    p.fps = 12 as 30;
    expect(() => q.enqueue({ project: p })).toThrow();
    expect(q.jobs).toHaveLength(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
