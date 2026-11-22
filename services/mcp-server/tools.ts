import { z } from "zod";
import {
  ProjectSchema,
  SceneSchema,
  LayerSchema,
  KeyframeSchema,
  BrandSchema,
  animations,
  effectTypes,
  sceneTypes,
  uid,
  projectWarnings,
  type Project,
  type Scene,
  type Layer,
} from "../../packages/project-schema/index";
import { templates, createProject } from "../../packages/templates/index";

export type Fetcher = typeof fetch;
const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const empty = z.object({}).strict();
const templateIdSchema = z
  .string()
  .max(100)
  .refine(
    (value) => templates.some((t) => t.id === value),
    "Unknown template ID",
  );
const projectId = z.object({ projectId: id }).strict();
const sceneId = projectId.extend({ sceneId: id }).strict();
const layerId = sceneId.extend({ layerId: id }).strict();
const jsonPatch = z.record(z.string(), z.unknown());
export interface ToolDefinition {
  description: string;
  schema: z.ZodObject<any>;
  readOnly?: boolean;
  destructive?: boolean;
  run: (args: any, client: NovaClient) => Promise<unknown> | unknown;
}
export class NovaClient {
  constructor(
    public fetcher: Fetcher = fetch,
    public api = "http://127.0.0.1:8000",
    public worker = "http://127.0.0.1:8001",
    public token = process.env.NOVA_API_TOKEN,
  ) {
    for (const origin of [api, worker]) {
      const u = new URL(origin);
      if (
        !["127.0.0.1", "localhost", "[::1]"].includes(u.hostname) ||
        u.protocol !== "http:"
      )
        throw new Error("NOVA service origins must be local HTTP origins");
    }
  }
  async request(
    path: string,
    method = "GET",
    body?: unknown,
    worker = false,
  ): Promise<any> {
    if (
      !/^\/(api|worker)\/[a-zA-Z0-9_/?=&.-]+$/.test(path) ||
      path.includes("..")
    )
      throw new Error("Invalid API path");
    const response = await this.fetcher(
      `${worker ? this.worker : this.api}${path}`,
      {
        method,
        headers: {
          Accept: "application/json",
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(25000),
      },
    );
    const value = await response
      .json()
      .catch(() => ({ error: "Service returned an invalid response" }));
    if (!response.ok)
      throw new Error(
        `NOVA request rejected (${response.status}): ${typeof value.error === "string" ? value.error : typeof value.message === "string" ? value.message : "check service logs"}`,
      );
    return value;
  }
  async get(projectId: string) {
    return ProjectSchema.parse(
      await this.request(`/api/projects/${id.parse(projectId)}`),
    );
  }
  async save(project: Project) {
    const parsed = ProjectSchema.parse({
      ...project,
      updatedAt: new Date().toISOString(),
    });
    return this.request(`/api/projects/${id.parse(project.id)}`, "PUT", parsed);
  }
  async mutate(projectId: string, fn: (project: Project) => void) {
    const project = await this.get(projectId);
    fn(project);
    return this.save(project);
  }
  async audit(tool: string, ok: boolean) {
    try {
      await this.request("/api/activity", "POST", {
        action: `mcp.${tool}`,
        subject: "agent",
        details: { status: ok ? "success" : "error" },
      });
    } catch {
      /* Audit availability must not obscure the tool result. */
    }
  }
}
function scene(project: Project, id: string) {
  const value = project.scenes.find((s) => s.id === id);
  if (!value) throw new Error("Scene not found");
  return value;
}
function layer(project: Project, sceneId: string, layerId: string) {
  const value = scene(project, sceneId).layers.find((l) => l.id === layerId);
  if (!value) throw new Error("Layer not found");
  return value;
}
function copyScene(source: Scene): Scene {
  return {
    ...structuredClone(source),
    id: uid(),
    name: `${source.name} copy`,
    layers: source.layers.map((l) => ({
      ...structuredClone(l),
      id: uid(),
      keyframes: l.keyframes.map((k) => ({ ...k, id: uid() })),
    })),
  };
}
function assertPatch(patch: Record<string, unknown>, forbidden: string[]) {
  for (const key of forbidden)
    if (key in patch) throw new Error(`Cannot patch protected field: ${key}`);
}
const tools: Record<string, ToolDefinition> = {
  list_projects: {
    description:
      "List saved local NOVA projects. Returns real persisted project data.",
    schema: empty,
    readOnly: true,
    run: (_, c) => c.request("/api/projects"),
  },
  create_project: {
    description:
      "Create and persist a project from one of the built-in editable templates.",
    schema: z
      .object({
        templateId: templateIdSchema.optional(),
        name: z.string().min(1).max(200).optional(),
      })
      .strict(),
    run: async (a, c) => {
      const p = createProject(a.templateId);
      if (a.name) p.name = a.name;
      return c.request("/api/projects", "POST", ProjectSchema.parse(p));
    },
  },
  get_project: {
    description:
      "Read the canonical schemaVersion 1 project including scenes, tracks, assets and animations.",
    schema: projectId,
    readOnly: true,
    run: (a, c) => c.get(a.projectId),
  },
  update_project: {
    description:
      "Replace a project with a validated complete canonical project. IDs must match.",
    schema: projectId.extend({ project: ProjectSchema }).strict(),
    run: async (a, c) => {
      if (a.projectId !== a.project.id) throw new Error("Project ID mismatch");
      return c.save(a.project);
    },
  },
  import_project: {
    description:
      "Validate and import canonical JSON as a new project; never executes code or fetches arbitrary URLs.",
    schema: z.object({ project: ProjectSchema }).strict(),
    run: (a, c) =>
      c.request("/api/projects", "POST", {
        ...a.project,
        id: uid(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
  },
  export_project: {
    description:
      "Return portable canonical JSON. Referenced assets are listed; binary archive export is separate.",
    schema: projectId,
    readOnly: true,
    run: (a, c) => c.get(a.projectId),
  },
  validate_project: {
    description:
      "Validate project structure and resource limits without saving; returns actionable layout/asset warnings.",
    schema: z.object({ project: ProjectSchema }).strict(),
    readOnly: true,
    run: (a) => ({
      valid: true,
      project: a.project,
      warnings: projectWarnings(a.project),
    }),
  },
  get_project_schema: {
    description:
      "Get the machine-readable canonical JSON Schema, frame timing rules and local asset policy.",
    schema: empty,
    readOnly: true,
    run: () => ({
      schema: z.toJSONSchema(ProjectSchema, { unrepresentable: "any" }),
      timing:
        "All startFrame, duration, trimStart and keyframe.frame values are integer frames. Scene starts are absolute; layer and keyframe frames are scene/layer relative respectively.",
      assets:
        "Only registered /storage/assets/<id>.<extension> references; upload files before referencing them. No JavaScript, URLs, expressions or filesystem paths.",
      limits: {
        durationSeconds: 1800,
        scenes: 100,
        layersPerScene: 200,
        tracks: 30,
      },
    }),
  },
  duplicate_project: {
    description:
      "Duplicate project and all scene/layer/keyframe IDs; preserve registered asset references.",
    schema: projectId,
    run: async (a, c) => {
      const p = await c.get(a.projectId);
      const now = new Date().toISOString();
      return c.request("/api/projects", "POST", {
        ...p,
        id: uid(),
        name: `${p.name} copy`,
        createdAt: now,
        updatedAt: now,
        scenes: p.scenes.map(copyScene),
      });
    },
  },
  delete_project: {
    description:
      "Permanently delete a project. Must receive explicit user authorization and confirm:true.",
    schema: projectId.extend({ confirm: z.literal(true) }).strict(),
    destructive: true,
    run: (a, c) =>
      c.request(`/api/projects/${a.projectId}`, "DELETE", {
        confirm: a.confirm,
      }),
  },
  get_project_versions: {
    description: "List stored revisions of a project.",
    schema: projectId,
    readOnly: true,
    run: (a, c) => c.request(`/api/projects/${a.projectId}/versions`),
  },
  restore_project_version: {
    description:
      "Restore a saved revision. Requires confirmation because it replaces the current project.",
    schema: projectId
      .extend({
        versionId: z.number().int().positive(),
        confirm: z.literal(true),
      })
      .strict(),
    destructive: true,
    run: (a, c) =>
      c.request(
        `/api/projects/${a.projectId}/versions/${a.versionId}/restore`,
        "POST",
        { confirm: true },
      ),
  },
  list_scenes: {
    description: "List full scene definitions in timeline order.",
    schema: projectId,
    readOnly: true,
    run: async (a, c) => (await c.get(a.projectId)).scenes,
  },
  get_scene: {
    description: "Read one scene including layers and camera.",
    schema: sceneId,
    readOnly: true,
    run: async (a, c) => scene(await c.get(a.projectId), a.sceneId),
  },
  create_scene: {
    description:
      "Append a fully specified scene; startFrame may overlap scenes deliberately.",
    schema: projectId.extend({ scene: SceneSchema }).strict(),
    run: (a, c) =>
      c.mutate(a.projectId, (p) => {
        if (p.scenes.some((s) => s.id === a.scene.id))
          throw new Error("Scene ID already exists");
        p.scenes.push(a.scene);
      }),
  },
  update_scene: {
    description:
      "Patch editable scene fields. Scene ID and layers are protected; use layer tools for layers.",
    schema: sceneId.extend({ patch: jsonPatch }).strict(),
    run: (a, c) =>
      c.mutate(a.projectId, (p) => {
        assertPatch(a.patch, ["id", "layers"]);
        const s = scene(p, a.sceneId);
        Object.assign(s, SceneSchema.parse({ ...s, ...a.patch }));
      }),
  },
  delete_scene: {
    description:
      "Delete a scene with confirmation; final remaining scene cannot be deleted.",
    schema: sceneId.extend({ confirm: z.literal(true) }).strict(),
    destructive: true,
    run: (a, c) =>
      c.mutate(a.projectId, (p) => {
        scene(p, a.sceneId);
        if (p.scenes.length === 1)
          throw new Error("Project must contain at least one scene");
        p.scenes = p.scenes.filter((s) => s.id !== a.sceneId);
      }),
  },
  duplicate_scene: {
    description:
      "Duplicate a scene immediately after its source. Other scenes are not rippled.",
    schema: sceneId,
    run: (a, c) =>
      c.mutate(a.projectId, (p) => {
        const s = scene(p, a.sceneId);
        p.scenes.push({
          ...copyScene(s),
          startFrame: s.startFrame + s.duration,
        });
      }),
  },
  reorder_scenes: {
    description:
      "Set exact sequential scene order and recompute integer frame starts.",
    schema: projectId
      .extend({ sceneIds: z.array(id).min(1).max(100) })
      .strict(),
    run: (a, c) =>
      c.mutate(a.projectId, (p) => {
        if (
          a.sceneIds.length !== p.scenes.length ||
          new Set(a.sceneIds).size !== p.scenes.length
        )
          throw new Error("Supply every scene ID exactly once");
        let start = 0;
        p.scenes = a.sceneIds.map((sid: string) => {
          const s = scene(p, sid);
          const next = { ...s, startFrame: start };
          start += s.duration;
          return next;
        });
      }),
  },
  set_scene_duration: {
    description:
      "Set scene duration; trims layers to remain inside the scene. Does not move other scenes.",
    schema: sceneId
      .extend({ duration: z.number().int().min(1).max(108000) })
      .strict(),
    run: (a, c) =>
      c.mutate(a.projectId, (p) => {
        const s = scene(p, a.sceneId);
        s.duration = a.duration;
        s.layers = s.layers
          .filter((l) => l.startFrame < a.duration)
          .map((l) => ({
            ...l,
            duration: Math.min(l.duration, a.duration - l.startFrame),
          }));
      }),
  },
  add_layer: {
    description:
      "Add an editable layer on an existing track, using validated local assets only.",
    schema: sceneId.extend({ layer: LayerSchema }).strict(),
    run: (a, c) =>
      c.mutate(a.projectId, (p) => {
        scene(p, a.sceneId).layers.push(a.layer);
      }),
  },
  update_layer: {
    description:
      "Patch layer transform, text, media reference or animation. ID protected.",
    schema: layerId.extend({ patch: jsonPatch }).strict(),
    run: (a, c) =>
      c.mutate(a.projectId, (p) => {
        assertPatch(a.patch, ["id"]);
        const l = layer(p, a.sceneId, a.layerId);
        Object.assign(l, LayerSchema.parse({ ...l, ...a.patch }));
      }),
  },
  remove_layer: {
    description: "Remove layer after user confirms deletion.",
    schema: layerId.extend({ confirm: z.literal(true) }).strict(),
    destructive: true,
    run: (a, c) =>
      c.mutate(a.projectId, (p) => {
        layer(p, a.sceneId, a.layerId);
        const s = scene(p, a.sceneId);
        s.layers = s.layers.filter((l) => l.id !== a.layerId);
      }),
  },
  list_animation_presets: {
    description:
      "Catalog supported deterministic frame-driven layer animations.",
    schema: empty,
    readOnly: true,
    run: () => ({
      presets: animations,
      timing:
        "Layer-local frame based. Keyframes override corresponding transform properties.",
      easings: ["linear", "ease-in", "ease-out", "ease-in-out", "spring"],
    }),
  },
  apply_animation: {
    description: "Apply a deterministic motion preset to a layer.",
    schema: layerId.extend({ animation: z.enum(animations) }).strict(),
    run: (a, c) =>
      c.mutate(a.projectId, (p) => {
        layer(p, a.sceneId, a.layerId).animation = a.animation;
      }),
  },
  add_keyframe: {
    description: "Add a numeric layer-local keyframe. Supply explicit easing.",
    schema: layerId.extend({ keyframe: KeyframeSchema }).strict(),
    run: (a, c) =>
      c.mutate(a.projectId, (p) => {
        const l = layer(p, a.sceneId, a.layerId);
        if (l.keyframes.some((k) => k.id === a.keyframe.id))
          throw new Error("Keyframe ID already exists");
        l.keyframes.push(a.keyframe);
      }),
  },
  update_keyframe: {
    description: "Replace one existing keyframe by ID.",
    schema: layerId.extend({ keyframe: KeyframeSchema }).strict(),
    run: (a, c) =>
      c.mutate(a.projectId, (p) => {
        const l = layer(p, a.sceneId, a.layerId);
        const i = l.keyframes.findIndex((k) => k.id === a.keyframe.id);
        if (i < 0) throw new Error("Keyframe not found");
        l.keyframes[i] = a.keyframe;
      }),
  },
  remove_keyframe: {
    description: "Remove a keyframe from a layer.",
    schema: layerId.extend({ keyframeId: id }).strict(),
    run: (a, c) =>
      c.mutate(a.projectId, (p) => {
        const l = layer(p, a.sceneId, a.layerId);
        if (!l.keyframes.some((k) => k.id === a.keyframeId))
          throw new Error("Keyframe not found");
        l.keyframes = l.keyframes.filter((k) => k.id !== a.keyframeId);
      }),
  },
  configure_camera: {
    description:
      "Configure actual scene camera path, projection, intensity and field of view.",
    schema: sceneId.extend({ camera: SceneSchema.shape.camera }).strict(),
    run: (a, c) =>
      c.mutate(a.projectId, (p) => {
        scene(p, a.sceneId).camera = a.camera;
      }),
  },
  apply_visual_effect: {
    description: "Enable or disable an optional composable visual effect.",
    schema: sceneId
      .extend({
        effect: z.enum(effectTypes),
        enabled: z.boolean().default(true),
      })
      .strict(),
    run: (a, c) =>
      c.mutate(a.projectId, (p) => {
        const s = scene(p, a.sceneId);
        s.effects = a.enabled
          ? [...new Set([...s.effects, a.effect])]
          : s.effects.filter((e) => e !== a.effect);
      }),
  },
  configure_transition: {
    description: "Configure scene entrance transition and integer duration.",
    schema: sceneId
      .extend({
        transition: SceneSchema.shape.transition,
        duration: SceneSchema.shape.transitionDuration,
      })
      .strict(),
    run: (a, c) =>
      c.mutate(a.projectId, (p) => {
        const s = scene(p, a.sceneId);
        s.transition = a.transition;
        s.transitionDuration = a.duration;
      }),
  },
  list_assets: {
    description: "List registered local media assets. No filesystem browsing.",
    schema: empty,
    readOnly: true,
    run: (_, c) => c.request("/api/assets"),
  },
  get_asset: {
    description: "Get metadata for a registered asset ID.",
    schema: z.object({ assetId: id }).strict(),
    readOnly: true,
    run: async (a, c) => {
      const assets = await c.request("/api/assets");
      const asset = assets.find((x: any) => x.id === a.assetId);
      if (!asset) throw new Error("Asset not found");
      return asset;
    },
  },
  upload_asset: {
    description:
      "Upload base64 media bytes (8 MiB maximum MCP payload). Server validates actual file signatures; no remote URL fetching.",
    schema: z
      .object({
        name: z
          .string()
          .min(1)
          .max(255)
          .regex(/^[^/\\\x00]+$/),
        mime: z.string().max(100),
        base64: z
          .string()
          .min(4)
          .max(11184812)
          .regex(/^[A-Za-z0-9+/]+={0,2}$/),
      })
      .strict(),
    run: async (a, c) => {
      const bytes = Buffer.from(a.base64, "base64");
      if (bytes.byteLength > 8 * 1024 * 1024)
        throw new Error("MCP upload exceeds 8 MiB; use Studio asset upload");
      const form = new FormData();
      form.set(
        "file",
        new Blob([new Uint8Array(bytes)], { type: a.mime }),
        a.name,
      );
      const res = await c.fetcher(`${c.api}/api/assets`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...(c.token ? { Authorization: `Bearer ${c.token}` } : {}),
        },
        body: form,
        signal: AbortSignal.timeout(25000),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(`Asset upload rejected (${res.status})`);
      return body;
    },
  },
  list_templates: {
    description: "List twelve distinct editable cinematic template families.",
    schema: empty,
    readOnly: true,
    run: () => templates,
  },
  get_template: {
    description:
      "Get an editable canonical project generated from a template without persisting.",
    schema: z.object({ templateId: templateIdSchema }).strict(),
    readOnly: true,
    run: (a) => createProject(a.templateId),
  },
  create_from_template: {
    description: "Create and persist a new project from a cinematic template.",
    schema: z
      .object({
        templateId: templateIdSchema,
        name: z.string().min(1).max(200).optional(),
      })
      .strict(),
    run: async (a, c) => {
      const p = createProject(a.templateId);
      if (a.name) p.name = a.name;
      return c.request("/api/projects", "POST", ProjectSchema.parse(p));
    },
  },
  get_scene_catalog: {
    description:
      "Scene families and accepted editable parameters for constructing cinematic videos.",
    schema: empty,
    readOnly: true,
    run: () => ({
      types: sceneTypes,
      schema: z.toJSONSchema(SceneSchema),
      notes:
        "The website and SaaS interfaces are original programmatic demo artwork. Replace image layers with uploaded real screenshots to show a real product. Text remains editable; RTL text uses whole shaped words, not isolated Persian glyphs.",
    }),
  },
  get_effect_catalog: {
    description: "Effect names and scene-level enable/disable contract.",
    schema: empty,
    readOnly: true,
    run: () => ({
      effects: effectTypes,
      schema: { effects: "array of names on scene" },
      quality:
        "Actual WebGL availability and supported effects depend on renderer capabilities; inspect health and preview.",
    }),
  },
  get_brand_profile: {
    description: "Get project brand kit or saved brand profiles.",
    schema: z.object({ projectId: id.optional() }).strict(),
    readOnly: true,
    run: async (a, c) =>
      a.projectId ? (await c.get(a.projectId)).brand : c.request("/api/brands"),
  },
  update_brand_profile: {
    description:
      "Apply a validated brand kit to a project, optionally recoloring its scenes.",
    schema: projectId
      .extend({ brand: BrandSchema, applyToScenes: z.boolean().default(false) })
      .strict(),
    run: (a, c) =>
      c.mutate(a.projectId, (p) => {
        p.brand = a.brand;
        if (a.applyToScenes)
          for (const s of p.scenes) {
            s.accent = a.brand.primary;
            s.background = a.brand.background;
          }
      }),
  },
  start_render: {
    description:
      "Queue a real background video export; returns job ID. Poll get_render_status. Does not block until rendering finishes.",
    schema: projectId
      .extend({
        preset: z
          .enum(["draft", "instagram", "high", "4k"])
          .default("instagram"),
        format: z.enum(["mp4", "webm"]).default("mp4"),
      })
      .strict(),
    run: async (a, c) =>
      c.request(
        "/worker/jobs",
        "POST",
        {
          project: await c.get(a.projectId),
          preset: a.preset,
          format: a.format,
        },
        true,
      ),
  },
  render_preview: {
    description:
      "Queue a real low-resolution draft video. Poll job ID for progress.",
    schema: projectId,
    run: async (a, c) =>
      c.request(
        "/worker/jobs",
        "POST",
        { project: await c.get(a.projectId), preset: "draft", format: "mp4" },
        true,
      ),
  },
  render_frame: {
    description:
      "Queue or render a frame at an absolute frame number for visual review; returns real worker output.",
    schema: projectId
      .extend({ frame: z.number().int().min(0).max(108000) })
      .strict(),
    run: async (a, c) =>
      c.request(
        "/worker/frame",
        "POST",
        { project: await c.get(a.projectId), frame: a.frame },
        true,
      ),
  },
  render_contact_sheet: {
    description:
      "Request representative real frames for agent/user visual review.",
    schema: projectId,
    run: async (a, c) =>
      c.request(
        "/worker/contact-sheet",
        "POST",
        { project: await c.get(a.projectId) },
        true,
      ),
  },
  get_render_status: {
    description:
      "Get actual progress, stage, logs, error and output for a job.",
    schema: z.object({ jobId: id }).strict(),
    readOnly: true,
    run: (a, c) => c.request(`/worker/jobs/${a.jobId}`, "GET", undefined, true),
  },
  get_render_image: {
    description:
      "Return a completed PNG frame or contact sheet as actual MCP image content for compatible visual clients.",
    schema: z.object({ jobId: id }).strict(),
    readOnly: true,
    run: async (a, c) => {
      const job = await c.request(
        `/worker/jobs/${a.jobId}`,
        "GET",
        undefined,
        true,
      );
      if (
        job.status !== "completed" ||
        typeof job.output !== "string" ||
        !/^\/worker\/outputs\/[a-zA-Z0-9_-]+\.png$/.test(job.output)
      )
        throw new Error("Job does not have a completed PNG output");
      const res = await c.fetcher(`${c.worker}${job.output}`, {
        headers: { ...(c.token ? { Authorization: `Bearer ${c.token}` } : {}) },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok || !res.headers.get("content-type")?.startsWith("image/png"))
        throw new Error("PNG output unavailable");
      const reader = res.body?.getReader();
      if (!reader) throw new Error("Empty image response");
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 10 * 1024 * 1024) {
          await reader.cancel();
          throw new Error(
            "Image exceeds MCP size limit; inspect local output instead",
          );
        }
        chunks.push(value);
      }
      return {
        _novaImage: true,
        mimeType: "image/png",
        data: Buffer.concat(chunks).toString("base64"),
        jobId: a.jobId,
      };
    },
  },
  get_render_result: {
    description:
      "Read a real job result; only completed jobs have playable outputs.",
    schema: z.object({ jobId: id }).strict(),
    readOnly: true,
    run: (a, c) => c.request(`/worker/jobs/${a.jobId}`, "GET", undefined, true),
  },
  cancel_render: {
    description: "Cancel a real queued or active render.",
    schema: z.object({ jobId: id }).strict(),
    run: (a, c) =>
      c.request(`/worker/jobs/${a.jobId}/cancel`, "POST", {}, true),
  },
  list_render_jobs: {
    description: "List actual persisted render jobs and statuses.",
    schema: empty,
    readOnly: true,
    run: (_, c) => c.request("/worker/jobs", "GET", undefined, true),
  },
  get_system_capabilities: {
    description:
      "Return measured renderer and local system health. Never assumes GPU acceleration.",
    schema: empty,
    readOnly: true,
    run: (_, c) => c.request("/worker/health", "GET", undefined, true),
  },
  get_renderer_health: {
    description: "Inspect running renderer health and availability.",
    schema: empty,
    readOnly: true,
    run: (_, c) => c.request("/worker/health", "GET", undefined, true),
  },
  get_storage_usage: {
    description: "Get actual local storage usage.",
    schema: empty,
    readOnly: true,
    run: (_, c) => c.request("/api/storage"),
  },
  get_supported_formats: {
    description:
      "Document accepted asset/render types. Real format availability is checked at render time.",
    schema: empty,
    readOnly: true,
    run: () => ({
      video: ["mp4 H.264", "webm VP8/VP9 when supported"],
      stills: ["png"],
      audio: ["AAC in MP4", "imported WAV/MP3/OGG"],
      models: ["glb"],
      fonts: ["woff2"],
      timing: "integer frames",
      remoteFetching: false,
    }),
  },
};
export const toolDefinitions = tools;
export async function dispatchTool(
  name: string,
  args: unknown,
  client = new NovaClient(),
) {
  const definition = tools[name];
  if (!definition) throw new Error("Unknown NOVA tool");
  try {
    const parsed = definition.schema.parse(args ?? {});
    const result = await definition.run(parsed, client);
    await client.audit(name, true);
    return result;
  } catch (error) {
    await client.audit(name, false);
    throw error;
  }
}
