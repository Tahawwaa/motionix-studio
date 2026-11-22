import { describe, it, expect, beforeEach } from "vitest";
import {
  ProjectSchema,
  LayerSchema,
  KeyframeSchema,
  makeLayer,
  projectWarnings,
  rescaleFps,
  uid,
} from "../packages/project-schema";
import { createProject, createScene, templates } from "../packages/templates";
import {
  moveItem,
  removeItems,
  splitLayer,
  splitScene,
  trimScene,
} from "../packages/project-schema/timeline";
import { useStudio } from "../apps/studio/src/store";
describe("canonical project security", () => {
  it("accepts all12 distinct templates and Persian", () => {
    expect(new Set(templates.map((t) => t.type)).size).toBe(12);
    for (const t of templates)
      expect(ProjectSchema.safeParse(createProject(t.id)).success).toBe(true);
    expect(createProject("business").scenes[0].title).toMatch(/وب/);
  });
  it("rejects executable fields, external paths, duplicate ids and fractional frames", () => {
    const p = createProject();
    expect(ProjectSchema.safeParse({ ...p, code: "alert(1)" }).success).toBe(
      false,
    );
    const layer = makeLayer("image", "media", p.scenes[0].duration);
    p.scenes[0].layers = [layer];
    expect(
      ProjectSchema.safeParse({
        ...p,
        scenes: [{ ...p.scenes[0], startFrame: 0.5 }],
      }).success,
    ).toBe(false);
    p.assets = [{ id: "bad", path: "https://attacker.test/a.png" }] as never;
    expect(ProjectSchema.safeParse(p).success).toBe(false);
    const dup = createProject();
    dup.scenes[1].id = dup.scenes[0].id;
    expect(ProjectSchema.safeParse(dup).success).toBe(false);
  });
  it("rejects invalid CSS colors, infinity, out of range scale and untrusted font names", () => {
    const p = createProject();
    p.scenes[0].accent = "#12345";
    expect(ProjectSchema.safeParse(p).success).toBe(false);
    expect(
      LayerSchema.safeParse({
        ...makeLayer("text", "type", 40),
        scale: Infinity,
      }).success,
    ).toBe(false);
    expect(
      LayerSchema.safeParse({
        ...makeLayer("text", "type", 40),
        fontFamily: "url(https://x)",
      }).success,
    ).toBe(false);
  });
  it("identifies missing assets and mobile safe-zone risks", () => {
    const p = createProject();
    p.scenes[0].layers = [
      {
        ...makeLayer("text", "type", p.scenes[0].duration),
        assetId: "missing",
        y: 97,
      },
    ];
    expect(projectWarnings(p)).toHaveLength(2);
  });
  it("rescales frame timing without losing actual scene durations", () => {
    const p = createProject();
    const l = makeLayer("text", "type", 90);
    l.keyframes = [
      { id: uid(), property: "x", frame: 30, value: 20, easing: "linear" },
    ];
    p.scenes[0].layers = [l];
    const next = rescaleFps(p, 60);
    expect(next.scenes[0].duration).toBe(p.scenes[0].duration * 2);
    expect(next.scenes[0].layers[0].keyframes[0].frame).toBe(60);
    expect(ProjectSchema.safeParse(next).success).toBe(true);
  });
});
describe("frame-accurate timeline", () => {
  it("splits a scene and media trim offsets at an exact integer frame", () => {
    const p = createProject();
    p.scenes[0].layers = [
      { ...makeLayer("video", "media", p.scenes[0].duration), trimStart: 10 },
    ];
    const next = splitScene(p, p.scenes[0].id, 90);
    expect(next.scenes).toHaveLength(4);
    expect(next.scenes[0].duration).toBe(90);
    expect(next.scenes[1].startFrame).toBe(90);
    expect(next.scenes[1].layers[0].trimStart).toBe(100);
    expect(next.scenes[1].layers[0].duration).toBe(150);
    expect(p.scenes).toHaveLength(3);
  });
  it("splits a local layer and preserves content without changing source project", () => {
    const p = createProject();
    p.scenes[0].layers = [
      { ...makeLayer("audio", "sound", 120), startFrame: 20 },
    ];
    const id = p.scenes[0].layers[0].id;
    const next = splitLayer(p, id, 60);
    expect(next.scenes[0].layers.map((l) => l.duration)).toEqual([40, 80]);
    expect(next.scenes[0].layers[1].trimStart).toBe(40);
    expect(p.scenes[0].layers).toHaveLength(1);
  });
  it("does not split on an endpoint", () => {
    const p = createProject();
    expect(splitScene(p, p.scenes[0].id, 0)).toBe(p);
    expect(splitScene(p, p.scenes[0].id, 240)).toBe(p);
  });
  it("ripple deletion and trimming move later scenes and clamp layers", () => {
    const p = createProject();
    const next = removeItems(p, [p.scenes[0].id], true);
    expect(next.scenes[0].startFrame).toBe(0);
    p.scenes[0].layers = [
      { ...makeLayer("text", "type", 200), startFrame: 10 },
    ];
    const trimmed = trimScene(p, p.scenes[0].id, 100, true);
    expect(trimmed.scenes[1].startFrame).toBe(100);
    expect(trimmed.scenes[0].layers[0].duration).toBe(90);
  });
  it("snaps to nearby boundaries and prevents deletion of every scene", () => {
    const p = createProject();
    expect(moveItem(p, p.scenes[1].id, 245, true).scenes[1].startFrame).toBe(
      240,
    );
    expect(
      removeItems(
        p,
        p.scenes.map((s) => s.id),
      ),
    ).toBe(p);
  });
});
describe("editor history", () => {
  beforeEach(() => {
    useStudio.getState().setProject(createProject());
  });
  it("undo and redo restore actual content, not only selection", () => {
    const s = useStudio.getState(),
      id = s.project.scenes[0].id,
      original = s.project.scenes[0].title;
    s.updateScene(id, { title: "A verified edit" });
    expect(useStudio.getState().project.scenes[0].title).toBe(
      "A verified edit",
    );
    useStudio.getState().undo();
    expect(useStudio.getState().project.scenes[0].title).toBe(original);
    useStudio.getState().redo();
    expect(useStudio.getState().project.scenes[0].title).toBe(
      "A verified edit",
    );
  });
  it("adds a real layer and new track only when required", () => {
    useStudio.getState().addLayer("shape");
    const p = useStudio.getState().project;
    expect(p.scenes[0].layers[0].type).toBe("shape");
    expect(p.tracks.filter((t) => t.type === "shape")).toHaveLength(1);
    expect(ProjectSchema.safeParse(p).success).toBe(true);
  });
  it("copy/paste creates unique scene and layer IDs", () => {
    const s = useStudio.getState();
    s.addLayer("text");
    const id = useStudio.getState().project.scenes[0].id;
    useStudio.getState().select(id);
    useStudio.getState().copy();
    useStudio.getState().paste();
    expect(ProjectSchema.safeParse(useStudio.getState().project).success).toBe(
      true,
    );
  });
});

describe("selection and track locks", () => {
  beforeEach(() => useStudio.getState().setProject(createProject()));
  it("keeps multi-selection and moves both scene clips with one undo step", () => {
    const p = useStudio.getState().project;
    useStudio.getState().select(p.scenes[0].id);
    useStudio.getState().select(p.scenes[1].id, true);
    expect(useStudio.getState().selected).toHaveLength(2);
    useStudio.getState().move(p.scenes[0].id, 30);
    expect(useStudio.getState().project.scenes[0].startFrame).toBe(30);
    expect(useStudio.getState().project.scenes[1].startFrame).toBe(270);
    useStudio.getState().undo();
    expect(useStudio.getState().project.scenes[0].startFrame).toBe(0);
    expect(useStudio.getState().project.scenes[1].startFrame).toBe(240);
  });
  it("prevents scene and layer modification on locked tracks", () => {
    useStudio.getState().addLayer("text");
    const layer = useStudio.getState().project.scenes[0].layers[0];
    const scene = useStudio.getState().project.scenes[0];
    useStudio.getState().edit((p) =>
      p.tracks.forEach((t) => {
        t.locked = true;
      }),
    );
    useStudio.getState().updateLayer(layer.id, { text: "should not change" });
    useStudio.getState().updateScene(scene.id, { title: "should not change" });
    useStudio.getState().select(scene.id);
    useStudio.getState().setFrame(45);
    useStudio.getState().split();
    useStudio.getState().remove();
    expect(useStudio.getState().project.scenes).toHaveLength(3);
    expect(useStudio.getState().project.scenes[0].title).toBe(scene.title);
    expect(useStudio.getState().project.scenes[0].layers[0].text).toBe(
      layer.text,
    );
  });
  it("selects grouped layers together", () => {
    useStudio.getState().addLayer("shape");
    const a = useStudio.getState().selected[0];
    useStudio.getState().addLayer("shape");
    const b = useStudio.getState().selected[0];
    useStudio.getState().select(a, true);
    useStudio.getState().group();
    useStudio.getState().select(a);
    expect(new Set(useStudio.getState().selected)).toEqual(new Set([a, b]));
  });
});
