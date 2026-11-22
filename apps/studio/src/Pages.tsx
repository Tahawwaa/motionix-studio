import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  LayoutGrid,
  List,
  ArrowUpRight,
  MoreHorizontal,
  Copy,
  Archive,
  Trash2,
  FolderOpen,
  Search,
  Download,
  Film,
  Clock,
  Check,
  LoaderCircle,
  X,
  RefreshCw,
  Settings2,
  Monitor,
  Cpu,
  Shield,
  Plug,
  HardDrive,
  Palette,
  Globe,
  Upload,
  ChevronRight,
  ExternalLink,
  Terminal,
  Unplug,
  Image,
  Sparkles,
} from "lucide-react";
import { createProject, templates } from "../../../packages/templates";
import {
  ProjectSchema,
  durationOf,
  type Project,
  defaultBrand,
  uid,
} from "../../../packages/project-schema";
import { useStudio } from "./store";
import {
  api,
  request,
  jsonDownload,
  configuredProject,
  downloadFile,
  type RenderJob,
} from "./api";
import { TemplateArtwork, ProjectThumbnail, AssetGrid } from "./Library";
import { SearchInput, Empty, IconButton, Modal, Field } from "./ui";
import { Color, Num } from "./Inspector";
type Props = { onError: (s: string) => void; notify: (s: string) => void };
export function ProjectsPage({ onError, notify }: Props) {
  const s = useStudio(),
    qc = useQueryClient();
  const {
    data: projects = [],
    isLoading,
    error,
  } = useQuery({ queryKey: ["projects"], queryFn: api.projects });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All projects");
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
  const [renaming, setRenaming] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const importer = useRef<HTMLInputElement>(null);
  async function create() {
    try {
      const p = await configuredProject();
      await api.create(p);
      s.setProject(p);
      s.setPage("editor");
      qc.invalidateQueries({ queryKey: ["projects"] });
    } catch (e) {
      onError((e as Error).message);
    }
  }
  async function action(
    p: Project,
    type: "duplicate" | "archive" | "delete" | "rename",
  ) {
    try {
      if (type === "duplicate") {
        const copy = {
          ...structuredClone(p),
          id: uid(),
          name: p.name + " copy",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await api.create(copy);
        notify("Project duplicated");
      }
      if (type === "archive") {
        await api.save({ ...p, archived: !p.archived });
        notify(p.archived ? "Project restored" : "Project archived");
      }
      if (type === "delete") {
        await request(`/api/projects/${p.id}`, {
          method: "DELETE",
          body: JSON.stringify({ confirm: true }),
        });
        setPendingDelete(null);
        notify("Project deleted");
      }
      if (type === "rename") {
        await api.save({ ...p, name });
        setRenaming(null);
      }
      qc.invalidateQueries({ queryKey: ["projects"] });
    } catch (e) {
      onError((e as Error).message);
    }
  }
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR CREATIVE SPACE</span>
          <h1>Good things are in motion.</h1>
          <p>Pick up where you left off, or start something extraordinary.</p>
        </div>
        <div className="page-actions">
          <button className="button" onClick={() => importer.current?.click()}>
            <Upload size={16} /> Import project
          </button>
          <button className="button primary" onClick={() => void create()}>
            <Plus size={16} /> New project
          </button>
        </div>
      </div>
      <input
        hidden
        ref={importer}
        type="file"
        accept=".json,.zip"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            let p: Project;
            if (f.name.endsWith(".zip")) {
              const fd = new FormData();
              fd.append("file", f);
              p = await request<Project>("/api/projects/import-backup", {
                method: "POST",
                body: fd,
              });
            } else {
              p = ProjectSchema.parse(JSON.parse(await f.text()));
              p.id = uid();
              p = await api.create(p);
            }
            s.setProject(p);
            s.setPage("editor");
            qc.invalidateQueries({ queryKey: ["projects"] });
          } catch (e) {
            onError((e as Error).message);
          }
        }}
      />
      <div className="page-filters">
        <div className="tabs">
          {["All projects", "Archived"].map((f) => (
            <button
              className={filter === f ? "selected" : ""}
              key={f}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search your projects…"
        />
      </div>
      {error && (
        <div className="error-banner">
          The project service is unavailable. Your current editor draft is
          preserved locally. {(error as Error).message}
        </div>
      )}
      {isLoading ? (
        <div className="loading">
          <LoaderCircle className="spin" /> Opening your workspace…
        </div>
      ) : (
        <div className="project-grid">
          {projects
            .filter(
              (p) =>
                p.archived === (filter === "Archived") &&
                p.name.toLowerCase().includes(search.toLowerCase()),
            )
            .map((p) => (
              <article className="project-card" key={p.id}>
                <button
                  className="project-cover"
                  onClick={() => {
                    s.setProject(p);
                    s.setPage("editor");
                  }}
                >
                  <ProjectThumbnail project={p} />
                  <span className="cover-ratio">
                    {p.width < p.height ? "9:16" : "16:9"}
                  </span>
                  <span className="cover-duration">
                    {(durationOf(p) / p.fps).toFixed(0)}s
                  </span>
                </button>
                <div className="project-info">
                  <button
                    onClick={() => {
                      s.setProject(p);
                      s.setPage("editor");
                    }}
                  >
                    <h3>{p.name}</h3>
                  </button>
                  <span>
                    {p.scenes.length} scenes <i />{" "}
                    {new Date(p.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="project-card-actions">
                  <IconButton
                    label="Rename project"
                    onClick={() => {
                      setRenaming(p);
                      setName(p.name);
                    }}
                  >
                    <Settings2 size={15} />
                  </IconButton>
                  <IconButton
                    label="Duplicate project"
                    onClick={() => void action(p, "duplicate")}
                  >
                    <Copy size={15} />
                  </IconButton>
                  <IconButton
                    label={p.archived ? "Restore project" : "Archive project"}
                    onClick={() => void action(p, "archive")}
                  >
                    <Archive size={15} />
                  </IconButton>
                  <IconButton
                    label="Delete project"
                    onClick={() => setPendingDelete(p)}
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </article>
            ))}
          <button className="new-project-card" onClick={() => void create()}>
            <span>
              <Plus size={24} />
            </span>
            <h3>A blank canvas. A big idea.</h3>
            <p>Create a new project</p>
          </button>
        </div>
      )}
      <div className="page-subheading">
        <div>
          <span className="eyebrow">A LITTLE INSPIRATION</span>
          <h2>Start a step ahead.</h2>
        </div>
        <button className="text-button" onClick={() => s.setPage("templates")}>
          View all templates <ArrowUpRight size={16} />
        </button>
      </div>
      <div className="inspiration-grid">
        {templates.slice(0, 3).map((t) => (
          <button
            key={t.id}
            onClick={async () => {
              try {
                const p = await configuredProject(t.id);
                await api.create(p);
                s.setProject(p);
                s.setPage("editor");
              } catch (e) {
                onError((e as Error).message);
              }
            }}
          >
            <TemplateArtwork type={t.type} accent={t.accent} />
            <h3>{t.name}</h3>
            <span>
              {t.category} · {t.duration} seconds
            </span>
          </button>
        ))}
      </div>
      <Modal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete this project?"
        description={`“${pendingDelete?.name}” and its saved revisions will be removed. Export a backup first if you want to keep them.`}
      >
        <div className="modal-actions">
          <button className="button" onClick={() => setPendingDelete(null)}>
            Keep project
          </button>
          <button
            className="button danger"
            onClick={() =>
              pendingDelete && void action(pendingDelete, "delete")
            }
          >
            Delete project
          </button>
        </div>
      </Modal>
      <Modal
        open={!!renaming}
        onClose={() => setRenaming(null)}
        title="Rename your project"
      >
        <Field label="Project name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </Field>
        <div className="modal-actions">
          <button
            className="button primary"
            disabled={!name.trim()}
            onClick={() => renaming && void action(renaming, "rename")}
          >
            Save name
          </button>
        </div>
      </Modal>
    </div>
  );
}
export function TemplatesPage({ onError, notify }: Props) {
  const qc = useQueryClient();
  const { data: saved = [] } = useQuery({
    queryKey: ["custom-templates"],
    queryFn: () =>
      request<Array<{ id: string; name: string; project: Project }>>(
        "/api/templates",
      ),
  });
  const s = useStudio();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [hovered, setHovered] = useState<string | null>(null);
  const [preview, setPreview] = useState<Project | null>(null);
  const cats = ["All", ...new Set(templates.map((t) => t.category))];
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE START OF SOMETHING GREAT</span>
          <h1>A head start for your next idea.</h1>
          <p>
            12 distinct, editable compositions. Built to move. Made to be yours.
          </p>
        </div>
        <button
          className="button"
          onClick={async () => {
            try {
              await request("/api/templates", {
                method: "POST",
                body: JSON.stringify({ project: s.project }),
              });
              void qc.invalidateQueries({ queryKey: ["custom-templates"] });
              notify("Current project saved as a reusable template");
            } catch (e) {
              onError((e as Error).message);
            }
          }}
        >
          <Plus size={14} /> Save current as template
        </button>
      </div>
      <div className="template-feature">
        <div>
          <span className="eyebrow">THE NOVA COLLECTION</span>
          <h2>
            Less starting from scratch.
            <br />
            More making your mark.
          </h2>
          <p>Cinematic scenes, precise motion, and room for your vision.</p>
          <button
            className="button"
            onClick={() => {
              setCategory("Website");
              setSearch("");
            }}
          >
            Explore website showcases <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="featured-art">
          <TemplateArtwork type="glass" accent="#67E8F9" />
        </div>
      </div>
      <div className="page-filters">
        <div className="tabs">
          {cats.map((c) => (
            <button
              className={c === category ? "selected" : ""}
              key={c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Find your starting point…"
        />
      </div>
      <div className="template-grid">
        {templates
          .filter(
            (t) =>
              (category === "All" || category === t.category) &&
              t.name.toLowerCase().includes(search.toLowerCase()),
          )
          .map((t) => (
            <article
              className="template-card"
              key={t.id}
              onMouseEnter={() => setHovered(t.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <button
                className="template-cover"
                onClick={() => setPreview(createProject(t.id))}
              >
                <TemplateArtwork type={t.type} accent={t.accent} />
                <span className="template-badge">
                  {t.type === "orbit" ? "REAL 3D" : "EDITABLE"}
                </span>
                <span className="template-preview-label">
                  Preview composition <ArrowUpRight size={15} />
                </span>
              </button>
              <div>
                <span className="eyebrow">
                  {t.category} <i /> {t.duration} SECONDS
                </span>
                <h3>{t.name}</h3>
                <p>{t.description}</p>
                <button
                  className="button full"
                  onClick={async () => {
                    try {
                      const p = await configuredProject(t.id);
                      await api.create(p);
                      s.setProject(p);
                      s.setPage("editor");
                    } catch (e) {
                      onError((e as Error).message);
                    }
                  }}
                >
                  Use this template <Plus size={14} />
                </button>
              </div>
            </article>
          ))}
      </div>
      {saved.length > 0 && (
        <>
          <div className="page-subheading">
            <div>
              <span className="eyebrow">YOUR OWN COLLECTION</span>
              <h2>Made by you. Ready for next time.</h2>
            </div>
          </div>
          <div className="template-grid">
            {saved
              .filter((t) =>
                t.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((t) => (
                <article className="template-card" key={t.id}>
                  <button
                    className="template-cover"
                    onClick={() => setPreview(t.project)}
                  >
                    <ProjectThumbnail project={t.project} />
                  </button>
                  <div>
                    <span className="eyebrow">MY TEMPLATE</span>
                    <h3>{t.name}</h3>
                    <p>
                      {t.project.scenes.length} scenes ·{" "}
                      {(durationOf(t.project) / t.project.fps).toFixed(1)}{" "}
                      seconds
                    </p>
                    <button
                      className="button full"
                      onClick={async () => {
                        try {
                          const p = {
                            ...structuredClone(t.project),
                            id: uid(),
                            name: t.name + " copy",
                            archived: false,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                          };
                          await api.create(p);
                          s.setProject(p);
                          s.setPage("editor");
                        } catch (e) {
                          onError((e as Error).message);
                        }
                      }}
                    >
                      Create from saved template
                      <Plus size={14} />
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </>
      )}
      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.name ?? "Template preview"}
        description="A real composition preview. Every scene is editable."
      >
        {preview && (
          <div className="template-live-preview">
            <ProjectThumbnail project={preview} controls />
          </div>
        )}
      </Modal>
    </div>
  );
}
export function RendersPage({ onError, notify }: Props) {
  const { data: jobs = [], error } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => request<RenderJob[]>("/worker/jobs"),
    refetchInterval: 1500,
  });
  const qc = useQueryClient();
  const [selected, setSelected] = useState<RenderJob | null>(null);
  async function action(j: RenderJob, action: "cancel" | "retry") {
    try {
      await request(`/worker/jobs/${j.id}/${action}`, {
        method: "POST",
        body: "{}",
      });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      notify(
        action === "cancel" ? "Cancellation requested" : "Render queued again",
      );
    } catch (e) {
      onError((e as Error).message);
    }
  }
  const active = jobs.filter(
    (j) => !["completed", "failed", "cancelled"].includes(j.status),
  );
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">FROM AN IDEA TO A FINISHED FILM</span>
          <h1>The final frame.</h1>
          <p>
            Your render queue, progress, and finished exports. All on your
            computer.
          </p>
        </div>
        <span className="outline-badge">
          <Cpu size={15} /> Local rendering
        </span>
      </div>
      <div className="render-summary">
        <div>
          <span>IN PROGRESS</span>
          <b>{active.length.toString().padStart(2, "0")}</b>
          <p>
            {active.length
              ? "Your vision is coming together."
              : "Ready when you are."}
          </p>
        </div>
        <div>
          <span>COMPLETED</span>
          <b>
            {jobs
              .filter((j) => j.status === "completed")
              .length.toString()
              .padStart(2, "0")}
          </b>
          <p>Ideas brought to life.</p>
        </div>
        <div>
          <span>RENDER ENGINE</span>
          <b className="engine-label">
            Remotion <span>4</span>
          </b>
          <p>Frame by frame. Deterministic by design.</p>
        </div>
      </div>
      {error && (
        <div className="error-banner">
          Renderer unavailable: {(error as Error).message}
        </div>
      )}
      {!jobs.length ? (
        <Empty icon={<Film size={40} />} title="Your next export belongs here.">
          Open a project and choose Export to render your first video.
        </Empty>
      ) : (
        <div className="render-list">
          {jobs
            .slice()
            .reverse()
            .map((j) => (
              <article className="render-item" key={j.id}>
                <div className={`render-icon ${j.status}`}>
                  {j.status === "completed" ? (
                    <Check size={22} />
                  ) : j.status === "failed" ? (
                    <X size={22} />
                  ) : j.status === "cancelled" ? (
                    <X size={22} />
                  ) : (
                    <LoaderCircle size={22} className="spin" />
                  )}
                </div>
                <div className="render-description">
                  <h3>{j.projectName || "Untitled project"}</h3>
                  <p>
                    <span className={`status-text ${j.status}`}>
                      {j.status}
                    </span>{" "}
                    <i /> {new Date(j.createdAt).toLocaleString()} <i />{" "}
                    {j.format || "mp4"}
                  </p>
                  {!["completed", "failed", "cancelled"].includes(j.status) && (
                    <div className="progress-track">
                      <div
                        style={{
                          width:
                            Math.max(0, Math.min(100, j.progress * 100)) + "%",
                        }}
                      />
                    </div>
                  )}
                  {j.error && <small className="error-text">{j.error}</small>}
                </div>
                <b>{Math.round(j.progress * 100)}%</b>
                <button className="button" onClick={() => setSelected(j)}>
                  View logs
                </button>
                {j.status === "completed" && j.output ? (
                  <a
                    className="button primary"
                    href={j.output}
                    onClick={(e) => {
                      e.preventDefault();
                      void downloadFile(j.output!).catch((e) =>
                        onError(e.message),
                      );
                    }}
                    download
                  >
                    <Download size={15} /> Download
                  </a>
                ) : ["failed", "cancelled"].includes(j.status) ? (
                  <IconButton
                    label="Retry render"
                    onClick={() => void action(j, "retry")}
                  >
                    <RefreshCw size={16} />
                  </IconButton>
                ) : (
                  <IconButton
                    label="Cancel render"
                    onClick={() => void action(j, "cancel")}
                  >
                    <X size={16} />
                  </IconButton>
                )}
              </article>
            ))}
        </div>
      )}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Render log"
        description={selected?.id}
      >
        <pre className="render-log">
          {(
            jobs.find((j) => j.id === selected?.id)?.logs ?? selected?.logs
          )?.join("\n") || "Waiting for renderer output…"}
        </pre>
      </Modal>
    </div>
  );
}
export function SettingsPage({ onError, notify }: Props) {
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => request<Record<string, unknown>>("/api/settings"),
  });
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () => request<Record<string, unknown>>("/worker/health"),
    retry: false,
  });
  const [form, setForm] = useState<Record<string, unknown>>({
    concurrency: 1,
    defaultWidth: 1080,
    defaultHeight: 1920,
    defaultFps: 30,
    quality: "draft",
    language: "en",
    provider: "none",
    providerModel: "llama3.2",
    providerUrl: "http://127.0.0.1:11434",
    safeZones: true,
    cacheLimitMb: 2048,
  });
  const [tab, setTab] = useState("Rendering");
  const [saving, setSaving] = useState(false);
  const s = useStudio();
  useEffect(() => {
    if (settings) setForm((v) => ({ ...v, ...settings }));
  }, [settings]);
  const change = (key: string, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));
  async function save() {
    setSaving(true);
    try {
      await request("/api/settings", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      notify("Studio preferences saved");
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  const tabs = [
    ["Rendering", Monitor],
    ["AI & connections", Plug],
    ["Brand kit", Palette],
    ["Workspace", HardDrive],
  ] as const;
  return (
    <div className="page settings-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">MAKE YOURSELF AT HOME</span>
          <h1>Your studio. Your way.</h1>
          <p>A thoughtful setup leaves more room for creating.</p>
        </div>
        <button
          className="button primary"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? (
            <LoaderCircle size={15} className="spin" />
          ) : (
            <Check size={15} />
          )}{" "}
          Save preferences
        </button>
      </div>
      <div className="settings-layout">
        <nav>
          {tabs.map(([name, Icon]) => (
            <button
              key={name}
              className={tab === name ? "selected" : ""}
              onClick={() => setTab(name)}
            >
              <Icon size={17} />
              {name}
              <ChevronRight size={14} />
            </button>
          ))}
        </nav>
        <div className="settings-content">
          {tab === "Rendering" ? (
            <>
              <div className="settings-section-heading">
                <Monitor size={21} />
                <div>
                  <h2>Rendering</h2>
                  <p>Quality and performance, in balance.</p>
                </div>
              </div>
              <div className="settings-card">
                <h3>Default composition</h3>
                <div className="field-pair">
                  <Num
                    label="Width · px"
                    min={256}
                    max={3840}
                    value={Number(form.defaultWidth)}
                    onChange={(n) => change("defaultWidth", Math.round(n))}
                  />
                  <Num
                    label="Height · px"
                    min={256}
                    max={3840}
                    value={Number(form.defaultHeight)}
                    onChange={(n) => change("defaultHeight", Math.round(n))}
                  />
                </div>
                <Field label="Frames per second">
                  <select
                    value={Number(form.defaultFps)}
                    onChange={(e) => change("defaultFps", +e.target.value)}
                  >
                    {[24, 25, 30, 60].map((n) => (
                      <option key={n} value={n}>
                        {n} FPS
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="settings-card">
                <h3>Performance</h3>
                <Num
                  label="Frame workers per render"
                  min={1}
                  max={4}
                  value={Number(form.concurrency)}
                  onChange={(n) => change("concurrency", n)}
                />
                <p className="hint">
                  Renders run one job at a time. Start with 2 frame workers on
                  an 8 GB GPU. The worker environment can override this
                  preference.
                </p>
                <Field label="Default quality">
                  <select
                    value={String(form.quality)}
                    onChange={(e) => change("quality", e.target.value)}
                  >
                    <option value="draft">Draft preview</option>
                    <option value="social">Social · 1080p</option>
                    <option value="high">High quality</option>
                  </select>
                </Field>
              </div>
              <div className="capability-card">
                <Shield size={22} />
                <div>
                  <h3>Honest about your hardware.</h3>
                  <p>
                    {health
                      ? "Renderer reachable. Software encoding is the default."
                      : "Renderer connection unavailable."}{" "}
                    GPU encoding is never assumed.
                  </p>
                  <pre>
                    {health
                      ? JSON.stringify(health, null, 2)
                      : "Start the renderer with npm run dev."}
                  </pre>
                </div>
              </div>
            </>
          ) : tab === "AI & connections" ? (
            <>
              <div className="settings-section-heading">
                <Plug size={21} />
                <div>
                  <h2>AI & connections</h2>
                  <p>
                    Bring your own agent. Keep control of your creative work.
                  </p>
                </div>
              </div>
              <div className="settings-card">
                <div className="card-title-row">
                  <h3>External agent · MCP</h3>
                  <span className="tag">STDIO</span>
                </div>
                <p>
                  Codex and compatible local agents can create and edit projects
                  through the real MCP server.
                </p>
                <pre className="code-block">
                  {JSON.stringify(
                    {
                      mcpServers: {
                        nova: {
                          command: "npm",
                          args: ["run", "mcp", "--silent"],
                          cwd: "/path/to/motionix-studio",
                        },
                      },
                    },
                    null,
                    2,
                  )}
                </pre>
                <button
                  className="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      JSON.stringify(
                        {
                          command: "npm",
                          args: ["run", "mcp", "--silent"],
                          cwd: "/path/to/motionix-studio",
                        },
                        null,
                        2,
                      ),
                    );
                    notify("Command copied; set cwd to the project folder");
                  }}
                >
                  <Copy size={14} /> Copy connection command
                </button>
                <p className="hint">
                  HTTP transport: npm run mcp:http. Set NOVA_MCP_TOKEN first.
                  See docs/mcp.md for supported client requirements.
                </p>
              </div>
              <div className="settings-card">
                <h3>Local API access</h3>
                <ApiAccess notify={notify} />
              </div>
              <div className="settings-card">
                <h3>Optional local AI provider</h3>
                <p>
                  Use an Ollama model on your computer to propose
                  schema-validated projects. No provider is connected by
                  default.
                </p>
                <Field label="Provider">
                  <select
                    value={String(form.provider)}
                    onChange={(e) => change("provider", e.target.value)}
                  >
                    <option value="none">
                      Disconnected · external agent mode
                    </option>
                    <option value="ollama">Local Ollama</option>
                  </select>
                </Field>
                {form.provider === "ollama" && (
                  <>
                    <Field label="Model name">
                      <input
                        value={String(form.providerModel)}
                        onChange={(e) =>
                          change("providerModel", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Local endpoint">
                      <input
                        value={String(form.providerUrl)}
                        onChange={(e) => change("providerUrl", e.target.value)}
                      />
                    </Field>
                    <p className="hint">
                      Only the local loopback Ollama endpoint is supported.
                      Availability is checked when you open Director.
                    </p>
                  </>
                )}
              </div>
            </>
          ) : tab === "Brand kit" ? (
            <>
              <div className="settings-section-heading">
                <Palette size={21} />
                <div>
                  <h2>Brand kit</h2>
                  <p>A consistent voice, from first frame to last.</p>
                </div>
              </div>
              <BrandEditor onError={onError} notify={notify} />
            </>
          ) : (
            <>
              <div className="settings-section-heading">
                <HardDrive size={21} />
                <div>
                  <h2>Local workspace</h2>
                  <p>Your work stays on your machine.</p>
                </div>
              </div>
              <div className="settings-card">
                <h3>Backup & portability</h3>
                <p>
                  Download a portable project archive containing your project
                  specification and imported assets.
                </p>
                <a
                  className="button"
                  href={`/api/projects/${s.project.id}/backup`}
                  onClick={(e) => {
                    e.preventDefault();
                    void downloadFile(
                      `/api/projects/${s.project.id}/backup`,
                      `${s.project.name}.zip`,
                    ).catch((e) => onError(e.message));
                  }}
                  download
                >
                  <Download size={15} /> Back up current project
                </a>
                <button
                  className="button"
                  onClick={() =>
                    jsonDownload(s.project, `${s.project.name}.json`)
                  }
                >
                  <Download size={15} /> Export project JSON
                </button>
              </div>
              <div className="settings-card">
                <h3>Storage & privacy</h3>
                <p>
                  Projects and revisions live in local SQLite. Assets and render
                  outputs are stored inside this project folder. No telemetry or
                  mandatory cloud account.
                </p>
                <div className="storage-path">
                  apps/backend/storage/app/private
                  <br />
                  .nova/outputs
                </div>
                <p className="hint">
                  Cache cleanup and changing the storage root are documented
                  manual operations in this release.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
function BrandEditor({ onError, notify }: Props) {
  const s = useStudio();
  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: () =>
      request<Array<{ id: string } & typeof defaultBrand>>("/api/brands"),
  });
  const qc = useQueryClient();
  const brand = s.project.brand;
  return (
    <div className="settings-card">
      <h3>Current project brand</h3>
      <Field label="Brand name">
        <input
          value={brand.name}
          onChange={(e) =>
            s.edit((p) => {
              p.brand.name = e.target.value;
            })
          }
        />
      </Field>
      <div className="field-pair">
        <Color
          label="Primary"
          value={brand.primary}
          onChange={(v) =>
            s.edit((p) => {
              p.brand.primary = v;
            })
          }
        />
        <Color
          label="Secondary"
          value={brand.secondary}
          onChange={(v) =>
            s.edit((p) => {
              p.brand.secondary = v;
            })
          }
        />
      </div>
      <Field label="Brand font">
        <select
          value={brand.font}
          onChange={(e) =>
            s.edit((p) => {
              p.brand.font = e.target.value as typeof brand.font;
            })
          }
        >
          {["Inter", "Vazirmatn", "Georgia", "monospace"].map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </Field>
      <Field label="Call to action">
        <input
          dir="auto"
          value={brand.cta}
          onChange={(e) =>
            s.edit((p) => {
              p.brand.cta = e.target.value;
            })
          }
        />
      </Field>
      <div className="inline-actions">
        <button
          className="button primary"
          onClick={() => {
            s.edit((p) =>
              p.scenes.forEach((sc) => {
                sc.accent = p.brand.primary;
                sc.background = p.brand.background;
                sc.layers
                  .filter((l) => l.type === "text")
                  .forEach((l) => {
                    l.fontFamily = p.brand.font;
                  });
              }),
            );
            notify("Brand applied to every scene");
          }}
        >
          Apply to all scenes
        </button>
        <button
          className="button"
          onClick={async () => {
            try {
              await request("/api/brands", {
                method: "POST",
                body: JSON.stringify({ id: uid(), ...brand }),
              });
              qc.invalidateQueries({ queryKey: ["brands"] });
              notify("Brand profile saved");
            } catch (e) {
              onError((e as Error).message);
            }
          }}
        >
          Save brand profile
        </button>
      </div>
      <div className="saved-brands">
        {brands.map((b) => (
          <button
            key={b.id}
            onClick={() =>
              s.edit((p) => {
                p.brand = {
                  name: b.name,
                  primary: b.primary,
                  secondary: b.secondary,
                  background: b.background,
                  font: b.font,
                  cta: b.cta,
                };
              })
            }
          >
            <span style={{ background: b.primary }} />
            {b.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function ApiAccess({ notify }: { notify: (s: string) => void }) {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("nova-api-token") ?? "",
  );
  const qc = useQueryClient();
  return (
    <>
      <p className="hint">
        Only needed when you enable NOVA_API_TOKEN in the service environment.
        This token stays in the current browser session.
      </p>
      <Field label="API token">
        <input
          type="password"
          value={token}
          autoComplete="off"
          onChange={(e) => setToken(e.target.value)}
        />
      </Field>
      <button
        className="button"
        onClick={() => {
          if (token) sessionStorage.setItem("nova-api-token", token);
          else sessionStorage.removeItem("nova-api-token");
          void qc.invalidateQueries();
          notify(
            token
              ? "API token set for this session"
              : "Session API token cleared",
          );
        }}
      >
        Use token for this session
      </button>
    </>
  );
}
