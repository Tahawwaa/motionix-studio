import {
  ProjectSchema,
  type Project,
  type Layer,
  type Scene,
  uid,
} from "./index";
export function splitScene(
  p: Project,
  sceneId: string,
  frame: number,
): Project {
  const next = structuredClone(p),
    i = next.scenes.findIndex((s) => s.id === sceneId),
    s = next.scenes[i];
  if (!s) return p;
  const at = Math.round(frame - s.startFrame);
  if (at <= 0 || at >= s.duration) return p;
  const originalDuration = s.duration;
  const right: Scene = {
    ...structuredClone(s),
    id: uid(),
    name: s.name + " II",
    startFrame: frame,
    duration: originalDuration - at,
    layers: [],
  };
  right.layers = s.layers
    .filter((l) => l.startFrame + l.duration > at)
    .map((l) => ({
      ...structuredClone(l),
      id: uid(),
      startFrame: Math.max(0, l.startFrame - at),
      duration:
        l.startFrame >= at ? l.duration : l.startFrame + l.duration - at,
      trimStart: l.trimStart + Math.max(0, at - l.startFrame),
      keyframes: l.keyframes.map((k) => ({
        ...k,
        id: uid(),
        frame: Math.max(0, k.frame - Math.max(0, at - l.startFrame)),
      })),
    }));
  s.duration = at;
  s.layers = s.layers
    .filter((l) => l.startFrame < at)
    .map((l) => ({
      ...l,
      duration: Math.min(l.duration, at - l.startFrame),
      keyframes: l.keyframes.filter((k) => k.frame < at - l.startFrame),
    }));
  next.scenes.splice(i + 1, 0, right);
  return ProjectSchema.parse(next);
}
export function splitLayer(
  p: Project,
  id: string,
  absoluteFrame: number,
): Project {
  const next = structuredClone(p);
  for (const s of next.scenes) {
    const i = s.layers.findIndex((l) => l.id === id);
    if (i < 0) continue;
    const l = s.layers[i],
      at = Math.round(absoluteFrame - s.startFrame - l.startFrame);
    if (at <= 0 || at >= l.duration) return p;
    const right: Layer = {
      ...structuredClone(l),
      id: uid(),
      name: l.name + " II",
      startFrame: l.startFrame + at,
      duration: l.duration - at,
      trimStart: l.trimStart + at,
      keyframes: l.keyframes
        .filter((k) => k.frame >= at)
        .map((k) => ({ ...k, id: uid(), frame: k.frame - at })),
    };
    l.duration = at;
    l.keyframes = l.keyframes.filter((k) => k.frame < at);
    s.layers.splice(i + 1, 0, right);
  }
  return ProjectSchema.parse(next);
}
export function removeItems(
  p: Project,
  ids: string[],
  ripple = false,
): Project {
  const next = structuredClone(p);
  if (next.scenes.every((s) => ids.includes(s.id))) return p;
  const removed = next.scenes.filter((s) => ids.includes(s.id));
  next.scenes = next.scenes
    .filter((s) => !ids.includes(s.id))
    .map((s) => ({
      ...s,
      startFrame: ripple
        ? s.startFrame -
          removed
            .filter((r) => r.startFrame < s.startFrame)
            .reduce((n, r) => n + r.duration, 0)
        : s.startFrame,
      layers: s.layers.filter((l) => !ids.includes(l.id)),
    }));
  return ProjectSchema.parse(next);
}
export function trimScene(
  p: Project,
  id: string,
  newDuration: number,
  ripple = false,
): Project {
  const next = structuredClone(p);
  const s = next.scenes.find((s) => s.id === id);
  if (!s) return p;
  const duration = Math.max(1, Math.round(newDuration)),
    delta = duration - s.duration;
  s.duration = duration;
  s.layers = s.layers
    .filter((l) => l.startFrame < duration)
    .map((l) => ({
      ...l,
      duration: Math.min(l.duration, duration - l.startFrame),
      keyframes: l.keyframes.filter(
        (k) => k.frame < Math.min(l.duration, duration - l.startFrame),
      ),
    }));
  if (ripple)
    next.scenes.forEach((other) => {
      if (
        other.id !== id &&
        other.startFrame >= s.startFrame + s.duration - delta
      )
        other.startFrame += delta;
    });
  return ProjectSchema.parse(next);
}
export function moveItem(
  p: Project,
  id: string,
  start: number,
  snap = true,
): Project {
  const next = structuredClone(p);
  const boundaries = next.scenes
    .filter((s) => s.id !== id)
    .flatMap((s) => [s.startFrame, s.startFrame + s.duration]);
  let frame = Math.max(0, Math.round(start));
  if (snap) {
    const nearest = boundaries.find((b) => Math.abs(b - frame) <= p.fps / 4);
    if (nearest !== undefined) frame = nearest;
  }
  const s = next.scenes.find((s) => s.id === id);
  if (s) s.startFrame = frame;
  else
    for (const scene of next.scenes) {
      const l = scene.layers.find((l) => l.id === id);
      if (l)
        l.startFrame = Math.min(
          scene.duration - l.duration,
          Math.max(0, frame - scene.startFrame),
        );
    }
  return ProjectSchema.parse(next);
}
