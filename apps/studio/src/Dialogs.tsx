import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Plug,
  ArrowUpRight,
  Copy,
  Download,
  Upload,
  Film,
  Monitor,
  Image,
  Check,
  LoaderCircle,
  Shield,
  Send,
  FileJson,
  Terminal,
  ChevronDown,
  Play,
  X,
} from "lucide-react";
import {
  ProjectSchema,
  durationOf,
  projectWarnings,
  type Project,
} from "../../../packages/project-schema";
import { useStudio } from "./store";
import { request, jsonDownload, downloadFile, type RenderJob } from "./api";
import { Modal, Field, IconButton } from "./ui";
export function ExportDialog({
  open,
  onClose,
  onError,
  notify,
}: {
  open: boolean;
  onClose: () => void;
  onError: (s: string) => void;
  notify: (s: string) => void;
}) {
  const s = useStudio(),
    qc = useQueryClient();
  const [preset, setPreset] = useState("instagram");
  const [format, setFormat] = useState("mp4");
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<string | null>(null);
  const { data: status } = useQuery({
    queryKey: ["render", job],
    queryFn: () => request<RenderJob>(`/worker/jobs/${job}`),
    enabled: !!job,
    refetchInterval: (q) =>
      ["completed", "failed", "cancelled"].includes(q.state.data?.status ?? "")
        ? false
        : 1000,
  });
  const warnings = projectWarnings(s.project);
  async function render(kind = "video") {
    setBusy(true);
    try {
      const j = await request<RenderJob>(
        kind === "video"
          ? "/worker/jobs"
          : kind === "frame"
            ? "/worker/frame"
            : "/worker/contact-sheet",
        {
          method: "POST",
          body: JSON.stringify({
            project: s.project,
            preset,
            format: kind === "video" ? format : "png",
            ...(kind === "frame" ? { frame: s.frame } : {}),
          }),
        },
      );
      setJob(j.id);
      qc.invalidateQueries({ queryKey: ["jobs"] });
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Give your story its final frame."
      description="A real local render, using the same composition as your preview."
    >
      {!job ? (
        <>
          <div className="export-project">
            <div>
              <Film size={23} />
            </div>
            <section>
              <h3>{s.project.name}</h3>
              <p>
                {s.project.scenes.length} scenes ·{" "}
                {(durationOf(s.project) / s.project.fps).toFixed(1)} seconds ·{" "}
                {s.project.fps} FPS
              </p>
            </section>
            <span className="tag">LOCAL</span>
          </div>
          <Field label="Export preset">
            <select value={preset} onChange={(e) => setPreset(e.target.value)}>
              <option value="draft">Draft preview · 540 × 960</option>
              <option value="instagram">Instagram Reel · 1080 × 1920</option>
              <option value="high">High quality · project resolution</option>
              <option value="4k">Cinematic 4K · 2160 × 3840</option>
            </select>
          </Field>
          <Field label="Format">
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="mp4">MP4 · H.264 + AAC</option>
              <option value="webm">WebM · VP8 / Opus</option>
            </select>
          </Field>
          <div className="export-spec">
            <span>
              Render engine <b>Remotion + Chromium</b>
            </span>
            <span>
              Privacy <b>On your computer</b>
            </span>
            <span>
              Encoding <b>Software · verified output</b>
            </span>
          </div>
          {warnings.length > 0 && (
            <div className="warning-box">
              {warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          )}
          <div className="export-review-actions">
            <button
              className="button"
              disabled={busy}
              onClick={() => void render("frame")}
            >
              <Image size={14} /> Current frame
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => void render("contact-sheet")}
            >
              <Monitor size={14} /> Contact sheet
            </button>
          </div>
          <div className="modal-actions">
            <button className="button" onClick={onClose}>
              Keep creating
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void render()}
            >
              {busy ? (
                <LoaderCircle size={15} className="spin" />
              ) : (
                <Film size={15} />
              )}{" "}
              Render video
            </button>
          </div>
          <p className="hint center">
            Rendering continues in the background. You can keep working.
          </p>
        </>
      ) : (
        <div className="export-progress">
          <div
            className={`export-status-symbol ${status?.status === "completed" ? "complete" : ""}`}
          >
            {status?.status === "completed" ? (
              <Check size={32} />
            ) : status?.status === "failed" ? (
              <X size={32} />
            ) : (
              <LoaderCircle size={32} className="spin" />
            )}
          </div>
          <h3>
            {status?.status === "completed"
              ? "Your film is ready."
              : status?.status === "failed"
                ? "This render needs attention."
                : status?.status === "cancelled"
                  ? "Render cancelled."
                  : "Your vision, coming to life."}
          </h3>
          <p>
            {status?.status === "failed"
              ? status.error
              : status?.status === "completed"
                ? "Rendered locally. Verified. Ready to share."
                : "This is actual render progress from your local worker."}
          </p>
          <div className="progress-track">
            <div
              style={{ width: Math.round((status?.progress ?? 0) * 100) + "%" }}
            />
          </div>
          <strong>{Math.round((status?.progress ?? 0) * 100)}%</strong>
          <pre className="render-log compact">
            {status?.logs?.slice(-5).join("\n") ?? "Connecting to renderer…"}
          </pre>
          <div className="inline-actions">
            {status?.output && (
              <a
                className="button primary"
                href={status.output}
                onClick={(e) => {
                  e.preventDefault();
                  void downloadFile(status.output!).catch((e) =>
                    onError(e.message),
                  );
                }}
                download
              >
                <Download size={15} /> Download output
              </a>
            )}
            {status && ["queued", "rendering"].includes(status.status) && (
              <button
                className="button"
                onClick={async () => {
                  try {
                    await request(`/worker/jobs/${job}/cancel`, {
                      method: "POST",
                      body: "{}",
                    });
                    qc.invalidateQueries({ queryKey: ["render", job] });
                  } catch (e) {
                    onError((e as Error).message);
                  }
                }}
              >
                Cancel render
              </button>
            )}
            <button
              className="button"
              onClick={() => {
                onClose();
                s.setPage("renders");
              }}
            >
              Open Render Center
            </button>
            <button className="text-button" onClick={() => setJob(null)}>
              New export
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
export function Director({
  onClose,
  onError,
  notify,
}: {
  onClose: () => void;
  onError: (s: string) => void;
  notify: (s: string) => void;
}) {
  const s = useStudio();
  const [prompt, setPrompt] = useState("");
  const [json, setJson] = useState("");
  const [tab, setTab] = useState("Director");
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<Project | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const { data: provider, error } = useQuery({
    queryKey: ["director-status"],
    queryFn: () =>
      request<{
        connected: boolean;
        provider?: string;
        model?: string;
        available?: boolean;
        state?: string;
        models?: string[];
        message?: string;
      }>("/api/director/status"),
    retry: false,
  });
  const connected =
    provider?.connected ??
    provider?.available ??
    provider?.state === "connected";
  async function generate() {
    setBusy(true);
    try {
      const result = await request<{ project: Project }>("/api/director", {
        method: "POST",
        body: JSON.stringify({ prompt, project: s.project }),
      });
      setProposal(ProjectSchema.parse(result.project));
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function importJson(value: string) {
    try {
      setProposal(ProjectSchema.parse(JSON.parse(value)));
    } catch (e) {
      onError("The project specification is invalid. " + (e as Error).message);
    }
  }
  return (
    <aside className="director-panel">
      <div className="panel-heading">
        <span>
          <Sparkles size={16} /> AI Director
        </span>
        <IconButton label="Close Director" onClick={onClose}>
          <X size={16} />
        </IconButton>
      </div>
      <div className="director-tabs tabs">
        {["Director", "Project JSON"].map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="director-body">
        {tab === "Director" ? (
          <>
            <div className="director-mark">
              <Sparkles size={27} />
            </div>
            <span className="eyebrow">A CREATIVE PARTNER, ON YOUR TERMS</span>
            <h3>
              A bigger vision.
              <br />A clearer direction.
            </h3>
            <p>
              Describe your film to a local Ollama model, or let an external
              agent direct it through MCP.
            </p>
            <div
              className={`connection-status ${connected ? "connected" : ""}`}
            >
              <span />
              {connected
                ? `${provider?.model || "Ollama"} connected`
                : "No AI provider connected"}
            </div>
            {!connected && (
              <div className="agent-guide">
                <h4>Start in agent mode</h4>
                <p>
                  Connect Codex or another compatible agent to NOVA. It can
                  build scenes, adjust motion, and inspect real rendered frames.
                </p>
                <code>npm run mcp --silent</code>
                <button
                  className="text-button"
                  onClick={() => s.setPage("settings")}
                >
                  Connection settings <ArrowUpRight size={14} />
                </button>
              </div>
            )}
            <label className="director-prompt">
              <textarea
                aria-label="Creative direction"
                rows={5}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A 20-second cinematic website launch. Dark, architectural, confident. A slow reveal, floating interface, and a memorable final line…"
              />
              <div>
                <span>
                  {connected
                    ? "Local model · schema validated"
                    : "Connect a provider to generate"}
                </span>
                <button
                  aria-label="Generate project proposal"
                  disabled={!connected || !prompt.trim() || busy}
                  onClick={() => void generate()}
                >
                  {busy ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            </label>
            <button
              className="button full"
              disabled={!prompt.trim()}
              onClick={() => {
                void navigator.clipboard.writeText(
                  `${prompt}\n\nUse NOVA MCP tools to get_project_schema, create or edit project ${s.project.id}, validate_project and render_contact_sheet. Preserve imported assets. Do not execute code.`,
                );
                notify("Creative direction copied for your agent");
              }}
            >
              <Copy size={14} /> Copy brief for an agent
            </button>
            <p className="hint">
              No simulated AI. No video synthesis. Your scenes are programmatic,
              editable motion graphics.
            </p>
          </>
        ) : (
          <>
            <h3>Your film, as a specification.</h3>
            <p>
              Import a complete project created by an external agent. Every
              field is validated before it reaches the editor.
            </p>
            <textarea
              aria-label="Project JSON"
              className="json-editor"
              rows={16}
              value={json}
              onChange={(e) => setJson(e.target.value)}
              placeholder='{"schemaVersion": 1, "scenes": […]}'
            />
            <div className="inline-actions">
              <button
                className="button primary"
                onClick={() => importJson(json)}
                disabled={!json.trim()}
              >
                Validate & review
              </button>
              <button className="button" onClick={() => file.current?.click()}>
                <Upload size={14} /> Open JSON
              </button>
            </div>
            <input
              ref={file}
              type="file"
              accept=".json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const v = await f.text();
                  setJson(v);
                  importJson(v);
                }
              }}
            />
            <button
              className="button full"
              onClick={() => jsonDownload(s.project, `${s.project.name}.json`)}
            >
              <Download size={14} /> Export current specification
            </button>
          </>
        )}
        {proposal && (
          <div className="proposal-review">
            <Check size={20} />
            <h4>Validated proposal</h4>
            <b>{proposal.name}</b>
            <p>
              {proposal.scenes.length} scenes ·{" "}
              {(durationOf(proposal) / proposal.fps).toFixed(1)} seconds
            </p>
            <div className="inline-actions">
              <button
                className="button primary"
                onClick={() => {
                  s.apply(proposal);
                  setProposal(null);
                  notify("Project applied. Undo is available.");
                }}
              >
                Apply to editor
              </button>
              <button className="button" onClick={() => setProposal(null)}>
                Discard
              </button>
            </div>
          </div>
        )}
      </div>
      <footer className="director-footer">
        <Shield size={13} /> Validated JSON. Your files stay local.
      </footer>
    </aside>
  );
}
export function HistoryDialog({
  open,
  onClose,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  onError: (s: string) => void;
}) {
  const s = useStudio();
  const { data: versions = [] } = useQuery({
    queryKey: ["versions", s.project.id],
    queryFn: () =>
      request<
        Array<{
          id: number;
          version: number;
          created_at: string;
          createdAt?: string;
        }>
      >(`/api/projects/${s.project.id}/versions`),
    enabled: open,
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Project history"
      description="Restore a saved version. The current version is preserved as a new revision."
    >
      <div className="history-list">
        {versions.map((v) => (
          <div key={v.id ?? v.version}>
            <div>
              <b>Version {v.version}</b>
              <span>
                {new Date(v.created_at ?? v.createdAt ?? "").toLocaleString()}
              </span>
            </div>
            <button
              className="button"
              onClick={async () => {
                try {
                  const p = await request<Project>(
                    `/api/projects/${s.project.id}/versions/${v.version}/restore`,
                    { method: "POST", body: "{}" },
                  );
                  s.setProject(p);
                  onClose();
                } catch (e) {
                  onError((e as Error).message);
                }
              }}
            >
              Restore
            </button>
          </div>
        ))}
        {!versions.length && (
          <p className="hint">Save your project to create its first version.</p>
        )}
      </div>
    </Modal>
  );
}
