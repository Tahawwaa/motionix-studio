import type { Keyframe } from "../project-schema/index";
export const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export function ease(
  t: number,
  kind: Keyframe["easing"] = "ease-in-out",
): number {
  const x = clamp(t);
  switch (kind) {
    case "linear":
      return x;
    case "ease-in":
      return x * x * x;
    case "ease-out":
      return 1 - (1 - x) ** 3;
    case "spring":
      return x === 1 ? 1 : 1 - Math.cos(x * Math.PI * 4) * Math.exp(-x * 7);
    default:
      return x * x * (3 - 2 * x);
  }
}
export function keyframeValue(
  keys: Keyframe[],
  property: Keyframe["property"],
  frame: number,
  fallback: number,
): number {
  const p = keys
    .filter((k) => k.property === property)
    .sort((a, b) => a.frame - b.frame);
  if (!p.length) return fallback;
  if (frame <= p[0].frame) return p[0].value;
  for (let i = 1; i < p.length; i++) {
    if (frame <= p[i].frame)
      return mix(
        p[i - 1].value,
        p[i].value,
        ease(
          (frame - p[i - 1].frame) / (p[i].frame - p[i - 1].frame),
          p[i].easing,
        ),
      );
  }
  return p[p.length - 1].value;
}
export function seeded(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
export function cameraPosition(
  path: string,
  frame: number,
  duration: number,
  intensity = 0.6,
): [number, number, number] {
  const t = clamp(frame / duration);
  switch (path) {
    case "dolly-in":
      return [0, 0, mix(8, 5, t * intensity)];
    case "dolly-out":
      return [0, 0, mix(5, 8, t * intensity)];
    case "truck":
      return [Math.sin(t * Math.PI) * intensity * 2, 0, 6.5];
    case "crane":
      return [0, mix(-1, 1, t) * intensity, 6.5];
    case "static":
      return [0, 0, 6.5];
    default:
      return [
        Math.sin(t * Math.PI * 2) * intensity,
        Math.sin(t * Math.PI) * intensity * 0.4,
        6.5 + Math.cos(t * Math.PI * 2) * intensity * 0.5,
      ];
  }
}
