import { z } from "zod";
export const sceneTypes = [
  "website",
  "saas",
  "glass",
  "product",
  "mobile",
  "tech",
  "typography",
  "education",
  "before-after",
  "brand",
  "orbit",
  "business",
] as const;
export const animations = [
  "none",
  "fade",
  "slide",
  "scale",
  "spring",
  "stagger",
  "typewriter",
  "float",
  "orbit",
  "mask",
  "perspective",
  "parallax",
  "elastic",
] as const;
export const effectTypes = [
  "grain",
  "vignette",
  "bloom",
  "scanlines",
  "chromatic",
  "particles",
  "light-sweep",
  "glass",
] as const;
const frame = z.number().int().min(0).max(108000);
export const FontFamilySchema = z
  .string()
  .regex(/^(?:Inter|Vazirmatn|Georgia|monospace|asset:[a-zA-Z0-9_-]{1,100})$/);
const color = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
export const assetPath = z
  .string()
  .regex(/^\/storage\/assets\/[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/);
export const KeyframeSchema = z
  .object({
    id: z.string().max(100),
    frame,
    property: z.enum([
      "x",
      "y",
      "scale",
      "rotation",
      "opacity",
      "blur",
      "fontSize",
      "volume",
      "cameraX",
      "cameraY",
      "cameraZ",
    ]),
    value: z.number().finite().min(-10000).max(10000),
    easing: z
      .enum(["linear", "ease-in", "ease-out", "ease-in-out", "spring"])
      .default("ease-in-out"),
  })
  .strict();
export const LayerSchema = z
  .object({
    id: z.string().min(1).max(100),
    name: z.string().max(200),
    type: z.enum(["text", "image", "video", "audio", "shape", "model"]),
    trackId: z.string().max(100),
    startFrame: frame,
    duration: frame.min(1),
    x: z.number().finite().min(-200).max(200).default(50),
    y: z.number().finite().min(-200).max(200).default(50),
    width: z.number().min(1).max(400).default(80),
    height: z.number().min(1).max(400).default(20),
    rotation: z.number().min(-3600).max(3600).default(0),
    scale: z.number().min(0.01).max(20).default(1),
    opacity: z.number().min(0).max(1).default(1),
    zIndex: z.number().int().min(-100).max(100).default(1),
    text: z.string().max(10000).default(""),
    assetId: z.string().max(100).optional(),
    color: color.default("#F8FAFC"),
    fontSize: z.number().min(8).max(500).default(80),
    fontFamily: FontFamilySchema.default("Inter"),
    fontWeight: z.number().int().min(100).max(900).default(600),
    direction: z.enum(["auto", "ltr", "rtl"]).default("auto"),
    align: z.enum(["left", "center", "right"]).default("center"),
    animation: z.enum(animations).default("fade"),
    keyframes: z.array(KeyframeSchema).max(1000).default([]),
    volume: z.number().min(0).max(2).default(1),
    trimStart: frame.default(0),
    visible: z.boolean().default(true),
    groupId: z.string().max(100).optional(),
  })
  .strict();
export const SceneSchema = z
  .object({
    id: z.string().min(1).max(100),
    name: z.string().max(200),
    type: z.enum(sceneTypes),
    startFrame: frame,
    duration: frame.min(1),
    background: color.default("#09090B"),
    accent: color.default("#2563EB"),
    title: z.string().max(1000),
    subtitle: z.string().max(2000).default(""),
    eyebrow: z.string().max(200).default("NOVA STUDIO"),
    layers: z.array(LayerSchema).max(200).default([]),
    transition: z
      .enum([
        "fade",
        "slide",
        "zoom",
        "blur",
        "wipe",
        "flash",
        "glitch",
        "rotate",
        "none",
      ])
      .default("fade"),
    transitionDuration: frame.max(120).default(18),
    effects: z.array(z.enum(effectTypes)).max(8).default(["grain", "vignette"]),
    camera: z
      .object({
        projection: z
          .enum(["perspective", "orthographic"])
          .default("perspective"),
        path: z
          .enum(["orbit", "dolly-in", "dolly-out", "truck", "crane", "static"])
          .default("orbit"),
        intensity: z.number().min(0).max(3).default(0.6),
        fov: z.number().min(15).max(120).default(42),
      })
      .strict()
      .default({
        projection: "perspective",
        path: "orbit",
        intensity: 0.6,
        fov: 42,
      }),
  })
  .strict();
export const TrackSchema = z
  .object({
    id: z.string().max(100),
    name: z.string().max(200),
    type: z.enum([
      "scene",
      "text",
      "image",
      "video",
      "audio",
      "shape",
      "model",
      "effect",
      "camera",
    ]),
    locked: z.boolean().default(false),
    hidden: z.boolean().default(false),
    muted: z.boolean().default(false),
    solo: z.boolean().default(false),
  })
  .strict();
export const BrandSchema = z
  .object({
    name: z.string().max(200),
    primary: color,
    secondary: color,
    background: color,
    font: z.enum(["Inter", "Vazirmatn", "Georgia", "monospace"]),
    cta: z.string().max(500),
  })
  .strict();
export const AssetSchema = z
  .object({
    id: z.string().max(100),
    name: z.string().max(255),
    type: z.enum(["image", "video", "audio", "font", "model"]),
    path: assetPath,
    mime: z.string().max(100),
    size: z.number().min(0).max(104857600),
    tags: z.array(z.string().max(100)).max(30).default([]),
    folder: z.string().max(100).default("Library"),
    createdAt: z.string().max(100),
  })
  .strict();
export const ProjectSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(200),
    description: z.string().max(2000).default(""),
    width: z.number().int().min(256).max(3840),
    height: z.number().int().min(256).max(3840),
    fps: z.union([z.literal(24), z.literal(25), z.literal(30), z.literal(60)]),
    scenes: z.array(SceneSchema).min(1).max(100),
    tracks: z.array(TrackSchema).min(1).max(30),
    assets: z.array(AssetSchema).max(500).default([]),
    brand: BrandSchema,
    archived: z.boolean().default(false),
    createdAt: z.string().max(100),
    updatedAt: z.string().max(100),
  })
  .strict()
  .superRefine((p, ctx) => {
    const ids = new Set<string>();
    const tracks = new Set(p.tracks.map((t) => t.id));
    for (const s of p.scenes) {
      for (const item of [s, ...s.layers]) {
        if (ids.has(item.id))
          ctx.addIssue({
            code: "custom",
            message: "Duplicate scene or layer ID",
            path: ["scenes"],
          });
        ids.add(item.id);
      }
      for (const l of s.layers) {
        if (!tracks.has(l.trackId))
          ctx.addIssue({
            code: "custom",
            message: "Unknown track reference",
            path: ["scenes"],
          });
        if (l.startFrame + l.duration > s.duration)
          ctx.addIssue({
            code: "custom",
            message: "Layer exceeds scene duration",
            path: ["scenes"],
          });
      }
    }
    if (new Set(p.assets.map((a) => a.id)).size !== p.assets.length)
      ctx.addIssue({ code: "custom", message: "Duplicate asset ID" });
    for (const s of p.scenes)
      for (const l of s.layers) {
        if (new Set(l.keyframes.map((k) => k.id)).size !== l.keyframes.length)
          ctx.addIssue({ code: "custom", message: "Duplicate keyframe ID" });
      }
    if (new Set(p.tracks.map((t) => t.id)).size !== p.tracks.length)
      ctx.addIssue({
        code: "custom",
        message: "Duplicate track ID",
        path: ["tracks"],
      });
    if (
      Math.max(...p.scenes.map((s) => s.startFrame + s.duration)) >
      p.fps * 1800
    )
      ctx.addIssue({
        code: "custom",
        message: "Maximum project duration is 30 minutes",
      });
  });
export function rescaleFps(project: Project, fps: Project["fps"]): Project {
  const p = structuredClone(project),
    factor = fps / p.fps;
  for (const s of p.scenes) {
    s.startFrame = Math.round(s.startFrame * factor);
    s.duration = Math.max(1, Math.round(s.duration * factor));
    s.transitionDuration = Math.round(s.transitionDuration * factor);
    for (const l of s.layers) {
      l.startFrame = Math.min(
        s.duration - 1,
        Math.round(l.startFrame * factor),
      );
      l.duration = Math.max(
        1,
        Math.min(s.duration - l.startFrame, Math.round(l.duration * factor)),
      );
      l.trimStart = Math.round(l.trimStart * factor);
      l.keyframes = l.keyframes.map((k) => ({
        ...k,
        frame: Math.round(k.frame * factor),
      }));
    }
  }
  p.fps = fps;
  return ProjectSchema.parse(p);
}
export type Project = z.infer<typeof ProjectSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type Layer = z.infer<typeof LayerSchema>;
export type Track = z.infer<typeof TrackSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type Keyframe = z.infer<typeof KeyframeSchema>;
export type Brand = z.infer<typeof BrandSchema>;
export const durationOf = (p: Project) =>
  Math.max(1, ...p.scenes.map((s) => s.startFrame + s.duration));
export const uid = () => crypto.randomUUID();
export const defaultBrand: Brand = {
  name: "NOVA Studio",
  primary: "#2563EB",
  secondary: "#06B6D4",
  background: "#09090B",
  font: "Inter",
  cta: "Let’s build something extraordinary.",
};
export const makeLayer = (
  type: Layer["type"],
  trackId: string,
  duration: number,
): Layer =>
  LayerSchema.parse({
    id: uid(),
    name: type === "text" ? "Your next big idea" : `New ${type}`,
    type,
    trackId,
    startFrame: 0,
    duration,
    text: type === "text" ? "Your next\nbig idea." : "",
    fontSize: 90,
  });
export function validateProject(input: unknown) {
  return ProjectSchema.parse(input);
}
export function projectWarnings(p: Project): string[] {
  const a = new Set(p.assets.map((x) => x.id));
  return p.scenes.flatMap((s) =>
    s.layers.flatMap((l) => [
      ...(l.fontFamily.startsWith("asset:") &&
      !p.assets.some((a) => a.id === l.fontFamily.slice(6) && a.type === "font")
        ? [`${s.name}: missing asset for font in ${l.name}`]
        : []),
      ...(l.assetId && !a.has(l.assetId)
        ? [`${s.name}: missing asset for ${l.name}`]
        : []),
      ...(l.type === "text" && (l.y < 12 || l.y > 85)
        ? [`${s.name}: ${l.name} may overlap social interface safe zones`]
        : []),
      ...(l.type === "text" && l.text.length > 120 && l.fontSize > 90
        ? [`${s.name}: long text may overflow`]
        : []),
    ]),
  );
}
