import { create } from "zustand";
import {
  ProjectSchema,
  uid,
  type Project,
  type Scene,
  type Layer,
  type Asset,
  makeLayer,
} from "../../../packages/project-schema";
import { createProject } from "../../../packages/templates";
import {
  moveItem,
  removeItems,
  splitLayer,
  splitScene,
  trimScene,
} from "../../../packages/project-schema/timeline";
type Page =
  "editor" | "projects" | "templates" | "assets" | "renders" | "settings";
type Snapshot = { project: Project };
type Store = {
  project: Project;
  page: Page;
  frame: number;
  playing: boolean;
  selected: string[];
  past: Snapshot[];
  future: Snapshot[];
  dirty: boolean;
  savedAt: string | null;
  saveError: string | null;
  panel: "scenes" | "assets" | "text" | "motion" | "audio";
  director: boolean;
  safeZones: boolean;
  snapping: boolean;
  ripple: boolean;
  zoom: number;
  clipboard: (Scene | Layer)[];
  setPage: (p: Page) => void;
  setPanel: (p: Store["panel"]) => void;
  setFrame: (f: number) => void;
  setPlaying: (b: boolean) => void;
  select: (id: string, multi?: boolean) => void;
  setProject: (p: Project) => void;
  edit: (fn: (p: Project) => void) => void;
  apply: (p: Project) => void;
  updateScene: (id: string, patch: Partial<Scene>) => void;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
  addScene: (s: Scene) => void;
  addLayer: (type: Layer["type"], asset?: Asset) => void;
  duplicate: () => void;
  remove: () => void;
  split: () => void;
  move: (id: string, start: number) => void;
  trim: (id: string, duration: number) => void;
  undo: () => void;
  redo: () => void;
  copy: () => void;
  paste: () => void;
  group: () => void;
  markSaved: () => void;
  setError: (s: string | null) => void;
  toggle: (k: "director" | "safeZones" | "snapping" | "ripple") => void;
  setZoom: (n: number) => void;
};
function isLocked(p: Project, id: string) {
  if (p.scenes.some((s) => s.id === id))
    return !!p.tracks.find((t) => t.type === "scene")?.locked;
  const l = p.scenes.flatMap((s) => s.layers).find((l) => l.id === id);
  return !!p.tracks.find((t) => t.id === l?.trackId)?.locked;
}
function itemStart(p: Project, id: string) {
  const scene = p.scenes.find(
    (s) => s.id === id || s.layers.some((l) => l.id === id),
  );
  if (!scene) return 0;
  return scene.id === id
    ? scene.startFrame
    : scene.startFrame + scene.layers.find((l) => l.id === id)!.startFrame;
}
function initial() {
  try {
    const v = localStorage.getItem("nova-draft");
    if (v) return ProjectSchema.parse(JSON.parse(v));
  } catch {
    /* Recover safely from an incompatible draft. */
  }
  return createProject();
}
const persist = (project: Project) => {
  try {
    localStorage.setItem("nova-draft", JSON.stringify(project));
  } catch {
    /* Server persistence reports separate errors. */
  }
};
export const useStudio = create<Store>((set, get) => ({
  project: initial(),
  page: "editor",
  frame: 65,
  playing: false,
  selected: [],
  past: [],
  future: [],
  dirty: false,
  savedAt: null,
  saveError: null,
  panel: "scenes",
  director: false,
  safeZones: false,
  snapping: true,
  ripple: false,
  zoom: 1,
  clipboard: [],
  setPage: (page) => set({ page }),
  setPanel: (panel) => set({ panel }),
  setFrame: (frame) => set({ frame: Math.max(0, Math.round(frame)) }),
  setPlaying: (playing) => set({ playing }),
  select: (id, multi = false) =>
    set((s) => ({
      selected: (() => {
        const layer = s.project.scenes
          .flatMap((sc) => sc.layers)
          .find((l) => l.id === id);
        const related = layer?.groupId
          ? s.project.scenes
              .flatMap((sc) => sc.layers)
              .filter((l) => l.groupId === layer.groupId)
              .map((l) => l.id)
          : [id];
        return multi
          ? s.selected.includes(id)
            ? s.selected.filter((x) => !related.includes(x))
            : [...new Set([...s.selected, ...related])]
          : related;
      })(),
    })),
  setProject: (project) => {
    persist(project);
    set({
      project,
      selected: [],
      past: [],
      future: [],
      frame: 0,
      playing: false,
      dirty: false,
    });
  },
  edit: (fn) => {
    const p = structuredClone(get().project);
    fn(p);
    get().apply(p);
  },
  apply: (project) => {
    const p = ProjectSchema.parse({
      ...project,
      updatedAt: new Date().toISOString(),
    });
    persist(p);
    set((s) => ({
      project: p,
      past: [...s.past.slice(-49), { project: s.project }],
      future: [],
      dirty: true,
      saveError: null,
    }));
  },
  updateScene: (id, patch) => {
    if (isLocked(get().project, id)) return;
    get().edit((p) => {
      const s = p.scenes.find((s) => s.id === id);
      if (s) Object.assign(s, patch);
    });
  },
  updateLayer: (id, patch) => {
    if (isLocked(get().project, id)) return;
    get().edit((p) => {
      for (const s of p.scenes) {
        const l = s.layers.find((l) => l.id === id);
        if (l) Object.assign(l, patch);
      }
    });
  },
  addScene: (s) => {
    get().edit((p) => p.scenes.push(s));
    get().select(s.id);
    get().setFrame(s.startFrame + 20);
  },
  addLayer: (type, asset) => {
    const state = get();
    const selectedScene =
      state.project.scenes.find(
        (s) =>
          state.selected.includes(s.id) ||
          s.layers.some((l) => state.selected.includes(l.id)),
      ) ??
      state.project.scenes.find(
        (s) =>
          state.frame >= s.startFrame &&
          state.frame < s.startFrame + s.duration,
      ) ??
      state.project.scenes[0];
    const track = state.project.tracks.find(
      (t) => t.type === type && !t.locked,
    ) ?? {
      id: uid(),
      name: type[0].toUpperCase() + type.slice(1),
      type,
      locked: false,
      hidden: false,
      muted: false,
      solo: false,
    };
    const layer = makeLayer(type, track.id, selectedScene.duration);
    if (asset) {
      layer.assetId = asset.id;
      layer.name = asset.name;
      layer.width = 80;
      layer.height = 50;
    }
    get().edit((p) => {
      if (!p.tracks.some((t) => t.id === track.id)) p.tracks.push(track);
      if (asset && !p.assets.some((a) => a.id === asset.id))
        p.assets.push(asset);
      p.scenes.find((s) => s.id === selectedScene.id)!.layers.push(layer);
    });
    get().select(layer.id);
  },
  duplicate: () => {
    const s = get();
    get().edit((p) => {
      for (const scene of [...p.scenes]) {
        if (s.selected.includes(scene.id)) {
          p.scenes.push({
            ...structuredClone(scene),
            id: uid(),
            name: scene.name + " copy",
            startFrame: scene.startFrame + scene.duration,
            layers: scene.layers.map((l) => ({
              ...structuredClone(l),
              id: uid(),
              keyframes: l.keyframes.map((k) => ({ ...k, id: uid() })),
            })),
          });
        } else
          for (const l of [...scene.layers])
            if (s.selected.includes(l.id))
              scene.layers.push({
                ...structuredClone(l),
                id: uid(),
                name: l.name + " copy",
                x: l.x + 3,
                y: l.y + 3,
              });
      }
    });
  },
  remove: () => {
    const s = get();
    const locked = new Set(
      s.project.tracks.filter((t) => t.locked).map((t) => t.id),
    );
    const ids = s.selected.filter(
      (id) =>
        !isLocked(s.project, id) &&
        !s.project.scenes.some((sc) =>
          sc.layers.some((l) => l.id === id && locked.has(l.trackId)),
        ),
    );
    get().apply(removeItems(s.project, ids, s.ripple));
    set({ selected: [] });
  },
  split: () => {
    const s = get(),
      id = s.selected[0];
    if (!id || isLocked(s.project, id)) return;
    get().apply(
      s.project.scenes.some((sc) => sc.id === id)
        ? splitScene(s.project, id, s.frame)
        : splitLayer(s.project, id, s.frame),
    );
  },
  move: (id, start) => {
    const state = get();
    if (isLocked(state.project, id)) return;
    let next = moveItem(state.project, id, start, state.snapping);
    const delta = itemStart(next, id) - itemStart(state.project, id);
    if (state.selected.includes(id)) {
      for (const other of state.selected.filter(
        (x) => x !== id && !isLocked(state.project, x),
      )) {
        const parent = state.project.scenes.find((sc) =>
          sc.layers.some((l) => l.id === other),
        );
        if (parent && state.selected.includes(parent.id)) continue;
        next = moveItem(
          next,
          other,
          itemStart(state.project, other) + delta,
          false,
        );
      }
    }
    get().apply(next);
  },
  trim: (id, duration) => {
    const s = get();
    if (isLocked(s.project, id)) return;
    if (s.project.scenes.some((sc) => sc.id === id))
      get().apply(trimScene(s.project, id, duration, s.ripple));
    else
      get().edit((p) => {
        for (const sc of p.scenes) {
          const l = sc.layers.find((l) => l.id === id);
          if (l)
            l.duration = Math.max(
              1,
              Math.min(sc.duration - l.startFrame, Math.round(duration)),
            );
        }
      });
  },
  undo: () => {
    const s = get(),
      prev = s.past.at(-1);
    if (prev) {
      persist(prev.project);
      set({
        project: prev.project,
        past: s.past.slice(0, -1),
        future: [{ project: s.project }, ...s.future],
        dirty: true,
      });
    }
  },
  redo: () => {
    const s = get(),
      next = s.future[0];
    if (next) {
      persist(next.project);
      set({
        project: next.project,
        past: [...s.past, { project: s.project }],
        future: s.future.slice(1),
        dirty: true,
      });
    }
  },
  copy: () => {
    const s = get();
    set({
      clipboard: s.project.scenes
        .flatMap((sc) => [sc, ...sc.layers])
        .filter((x) => s.selected.includes(x.id))
        .map((x) => structuredClone(x)),
    });
  },
  paste: () => {
    const s = get();
    get().edit((p) => {
      for (const item of s.clipboard) {
        if ("layers" in item)
          p.scenes.push({
            ...structuredClone(item),
            id: uid(),
            startFrame: s.frame,
            layers: item.layers.map((l) => ({ ...l, id: uid() })),
          });
        else {
          const sc =
            p.scenes.find(
              (sc) =>
                s.frame >= sc.startFrame &&
                s.frame < sc.startFrame + sc.duration,
            ) ?? p.scenes[0];
          sc.layers.push({
            ...structuredClone(item),
            id: uid(),
            startFrame: Math.max(
              0,
              Math.min(sc.duration - 1, s.frame - sc.startFrame),
            ),
            duration: Math.min(
              item.duration,
              sc.duration -
                Math.max(0, Math.min(sc.duration - 1, s.frame - sc.startFrame)),
            ),
          });
        }
      }
    });
  },
  group: () => {
    const id = uid();
    get().edit((p) =>
      p.scenes.forEach((sc) =>
        sc.layers.forEach((l) => {
          if (get().selected.includes(l.id)) l.groupId = id;
        }),
      ),
    );
  },
  markSaved: () =>
    set({ dirty: false, savedAt: new Date().toISOString(), saveError: null }),
  setError: (saveError) => set({ saveError }),
  toggle: (k) => set((s) => ({ [k]: !s[k] })),
  setZoom: (zoom) => set({ zoom: Math.max(0.5, Math.min(5, zoom)) }),
}));
