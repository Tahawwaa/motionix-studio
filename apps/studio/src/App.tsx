import { useCallback, useEffect, useRef, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Player, type PlayerRef } from "@remotion/player";
import {
  Aperture,
  ArrowLeft,
  ArrowUpRight,
  Box,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clapperboard,
  Command,
  Download,
  Expand,
  Film,
  FolderOpen,
  HelpCircle,
  History,
  Image,
  LayoutDashboard,
  Layers,
  LoaderCircle,
  Maximize2,
  MoreHorizontal,
  Music2,
  PanelLeftClose,
  PanelRightClose,
  Pause,
  Play,
  Plus,
  Redo2,
  Save,
  Settings2,
  Shield,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Type,
  Undo2,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";
import { NovaComposition } from "../../../packages/video-engine";
import { createProject } from "../../../packages/templates";
import {
  durationOf,
  type Project,
  type Asset,
} from "../../../packages/project-schema";
import { useStudio } from "./store";
import { api, request, ApiError, jsonDownload } from "./api";
import { IconButton, Modal, Field } from "./ui";
import { LeftPanel, AssetGrid } from "./Library";
import { Inspector } from "./Inspector";
import { Timeline, timecode } from "./Timeline";
import {
  ProjectsPage,
  TemplatesPage,
  RendersPage,
  SettingsPage,
} from "./Pages";
import { Director, ExportDialog, HistoryDialog } from "./Dialogs";
export default function App() {
  const s = useStudio(),
    qc = useQueryClient();
  const [toast, setToast] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [history, setHistory] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [leftOpen, setLeftOpen] = useState(window.innerWidth > 720);
  const [rightOpen, setRightOpen] = useState(window.innerWidth > 1050);
  const [leftWidth, setLeftWidth] = useState(262);
  const [rightWidth, setRightWidth] = useState(272);
  const [timelineHeight, setTimelineHeight] = useState(250);
  const [saving, setSaving] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const notify = useCallback((message: string, error = false) => {
    setToast({ message, error });
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setToast(null), error ? 8000 : 3500);
  }, []);
  const onError = useCallback(
    (message: string) => notify(message, true),
    [notify],
  );
  const savingRef = useRef(false);
  const save = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const current = useStudio.getState().project;
    try {
      try {
        await api.save(current);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404)
          await api.create(current);
        else throw e;
      }
      if (useStudio.getState().project === current)
        useStudio.getState().markSaved();
      qc.invalidateQueries({ queryKey: ["projects"] });
    } catch (e) {
      useStudio.getState().setError((e as Error).message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [qc]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (s.dirty) void save();
    }, 1000);
    return () => clearTimeout(t);
  }, [s.project, s.dirty, saving, save]);
  useEffect(() => {
    void api
      .projects()
      .then(async (projects) => {
        if (!projects.some((p) => p.id === useStudio.getState().project.id)) {
          await api.create(useStudio.getState().project);
        }
        useStudio.getState().markSaved();
        qc.invalidateQueries({ queryKey: ["projects"] });
      })
      .catch((e) => useStudio.getState().setError((e as Error).message));
  }, [qc]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const editing =
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.isContentEditable;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
        return;
      }
      if (e.key === "Escape") {
        setExportOpen(false);
        setHistory(false);
        setShortcuts(false);
        useStudio.setState({ director: false });
        return;
      }
      if (editing) return;
      const current = useStudio.getState();
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? current.redo() : current.undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        current.redo();
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        current.duplicate();
      } else if (mod && e.key.toLowerCase() === "c") {
        e.preventDefault();
        current.copy();
      } else if (mod && e.key.toLowerCase() === "v") {
        e.preventDefault();
        current.paste();
      } else if (e.code === "Space" && current.page === "editor") {
        e.preventDefault();
        current.setPlaying(!current.playing);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        current.setFrame(
          Math.min(
            durationOf(current.project) - 1,
            current.frame + (e.shiftKey ? current.project.fps : 1),
          ),
        );
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        current.setFrame(
          Math.max(0, current.frame - (e.shiftKey ? current.project.fps : 1)),
        );
      } else if (e.key.toLowerCase() === "s") {
        current.split();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        current.remove();
      } else if (e.key === "?") setShortcuts(true);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [save]);
  function resize(
    e: React.PointerEvent<HTMLElement>,
    kind: "left" | "right" | "timeline",
  ) {
    const x = e.clientX,
      y = e.clientY;
    const start =
      kind === "left"
        ? leftWidth
        : kind === "right"
          ? rightWidth
          : timelineHeight;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      if (kind === "left")
        setLeftWidth(Math.max(220, Math.min(400, start + ev.clientX - x)));
      if (kind === "right")
        setRightWidth(Math.max(240, Math.min(420, start + x - ev.clientX)));
      if (kind === "timeline")
        setTimelineHeight(Math.max(180, Math.min(500, start + y - ev.clientY)));
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  }
  const nav = [
    { id: "editor", label: "Studio", icon: Clapperboard },
    { id: "projects", label: "Projects", icon: FolderOpen },
    { id: "templates", label: "Templates", icon: LayoutDashboard },
    { id: "assets", label: "Assets", icon: Image },
    { id: "renders", label: "Renders", icon: Film },
  ] as const;
  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="app-shell">
        <header className="app-header">
          <button
            className="brand"
            onClick={() => s.setPage("projects")}
            aria-label="NOVA home"
          >
            <span className="nova-mark">
              <Aperture size={27} strokeWidth={2} />
            </span>
            <span>
              NOVA<small>MOTION STUDIO</small>
            </span>
          </button>
          <div className="header-project">
            <span className="breadcrumb">Workspace</span>
            <ChevronRight size={13} />
            <input
              aria-label="Project title"
              value={s.project.name}
              onChange={(e) => {
                if (e.target.value.trim())
                  s.edit((p) => {
                    p.name = e.target.value;
                  });
              }}
            />
            <ChevronDown size={12} />
            <span className="project-version">v1</span>
          </div>
          <div className="header-actions">
            <button
              className={`save-status ${s.saveError ? "save-error" : ""}`}
              onClick={() => void save()}
              title={s.saveError ?? "Click to save"}
            >
              {saving ? (
                <LoaderCircle size={13} className="spin" />
              ) : s.saveError ? (
                <span className="error-dot" />
              ) : (
                <Check size={13} />
              )}
              <span>
                {saving
                  ? "Saving…"
                  : s.saveError
                    ? "Save unavailable"
                    : s.dirty
                      ? "Unsaved changes"
                      : "All changes saved"}
              </span>
            </button>
            <span className="divider" />
            <IconButton
              label="Undo (Ctrl Z)"
              disabled={!s.past.length}
              onClick={s.undo}
            >
              <Undo2 size={16} />
            </IconButton>
            <IconButton
              label="Redo (Ctrl Shift Z)"
              disabled={!s.future.length}
              onClick={s.redo}
            >
              <Redo2 size={16} />
            </IconButton>
            <IconButton
              label="Project version history"
              onClick={() => setHistory(true)}
            >
              <History size={16} />
            </IconButton>
            <span className="divider" />
            <button
              className={`button director-button ${s.director ? "selected" : ""}`}
              onClick={() => {
                s.setPage("editor");
                s.toggle("director");
              }}
            >
              <Sparkles size={15} /> AI Director
            </button>
            <button
              className="button primary export-button"
              onClick={() => setExportOpen(true)}
            >
              <Download size={15} /> Export <ChevronDown size={12} />
            </button>
            <span className="avatar">Y</span>
          </div>
        </header>
        <nav className="app-rail" aria-label="Main navigation">
          <div>
            {nav.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={s.page === id ? "active" : ""}
                onClick={() => s.setPage(id)}
                title={label}
              >
                <Icon size={20} strokeWidth={1.6} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div>
            <button
              onClick={() => setShortcuts(true)}
              title="Keyboard shortcuts"
            >
              <HelpCircle size={20} />
              <span>Help</span>
            </button>
            <button
              className={s.page === "settings" ? "active" : ""}
              onClick={() => s.setPage("settings")}
              title="Settings"
            >
              <Settings2 size={20} strokeWidth={1.6} />
              <span>Settings</span>
            </button>
            <span className="rail-local" title="Private local workspace">
              <Shield size={15} />
            </span>
          </div>
        </nav>
        <main className="main-content">
          {s.page === "editor" ? (
            <div className="editor">
              <div className="editor-subbar">
                <div className="editor-panel-tabs">
                  {[
                    { id: "scenes", label: "Scenes", icon: Layers },
                    { id: "assets", label: "Assets", icon: Image },
                    { id: "text", label: "Text", icon: Type },
                    { id: "motion", label: "Motion", icon: Sparkles },
                    { id: "audio", label: "Audio", icon: Music2 },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      className={s.panel === id && leftOpen ? "active" : ""}
                      onClick={() => {
                        if (s.panel === id && leftOpen) setLeftOpen(false);
                        else {
                          s.setPanel(id as typeof s.panel);
                          setLeftOpen(true);
                        }
                      }}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  ))}
                </div>
                <div className="subbar-right">
                  <span className="autosave-label">
                    <span className="local-dot" /> LOCAL FIRST
                  </span>
                  <IconButton
                    label={leftOpen ? "Collapse library" : "Show library"}
                    onClick={() => setLeftOpen(!leftOpen)}
                  >
                    <PanelLeftClose size={16} />
                  </IconButton>
                  <IconButton
                    label={rightOpen ? "Collapse inspector" : "Show inspector"}
                    onClick={() => setRightOpen(!rightOpen)}
                  >
                    <PanelRightClose size={16} />
                  </IconButton>
                </div>
              </div>
              <div
                className={`workspace ${leftOpen ? "library-open" : ""} ${rightOpen ? "inspector-open" : ""}`}
                style={{
                  gridTemplateColumns: `${leftOpen ? leftWidth : 0}px ${leftOpen ? 4 : 0}px minmax(200px,1fr) ${rightOpen ? 4 : 0}px ${rightOpen ? rightWidth : 0}px ${s.director ? 326 : 0}px`,
                }}
              >
                {leftOpen && <LeftPanel onError={onError} />}
                <div
                  className="resize-handle vertical"
                  style={{ gridColumn: 2 }}
                  onPointerDown={(e) => resize(e, "left")}
                />
                <div className="preview-column" style={{ gridColumn: 3 }}>
                  <Preview onError={onError} />
                </div>
                <div
                  className="resize-handle vertical"
                  style={{ gridColumn: 4 }}
                  onPointerDown={(e) => resize(e, "right")}
                />
                {rightOpen && <Inspector />}
                {s.director && (
                  <Director
                    onClose={() => s.toggle("director")}
                    onError={onError}
                    notify={(m) => notify(m)}
                  />
                )}
              </div>
              <div
                className="resize-handle horizontal"
                onPointerDown={(e) => resize(e, "timeline")}
              />
              <div
                className="timeline-container"
                style={{ height: timelineHeight }}
              >
                <Timeline />
              </div>
            </div>
          ) : s.page === "projects" ? (
            <ProjectsPage onError={onError} notify={(m) => notify(m)} />
          ) : s.page === "templates" ? (
            <TemplatesPage onError={onError} notify={(m) => notify(m)} />
          ) : s.page === "assets" ? (
            <div className="page assets-page">
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    THE BUILDING BLOCKS OF YOUR NEXT IDEA
                  </span>
                  <h1>Made of good things.</h1>
                  <p>
                    Your images, footage, audio, and 3D objects. In one private
                    library.
                  </p>
                </div>
                <span className="outline-badge">
                  <Shield size={15} /> Stored locally
                </span>
              </div>
              <AssetGrid onError={onError} />
            </div>
          ) : s.page === "renders" ? (
            <RendersPage onError={onError} notify={(m) => notify(m)} />
          ) : (
            <SettingsPage onError={onError} notify={(m) => notify(m)} />
          )}
        </main>
        <ExportDialog
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          onError={onError}
          notify={(m) => notify(m)}
        />
        <HistoryDialog
          open={history}
          onClose={() => setHistory(false)}
          onError={onError}
        />
        <Modal
          open={shortcuts}
          onClose={() => setShortcuts(false)}
          title="A faster way to make your move."
          description="Keyboard shortcuts for your creative flow."
        >
          <div className="shortcut-list">
            {[
              ["Play / pause", "Space"],
              ["Previous / next frame", "← / →"],
              ["Jump one second", "Shift ← / →"],
              ["Split at playhead", "S"],
              ["Duplicate selection", "Ctrl D"],
              ["Undo", "Ctrl Z"],
              ["Redo", "Ctrl Shift Z"],
              ["Copy / paste", "Ctrl C / V"],
              ["Save project", "Ctrl S"],
              ["Delete selection", "Delete"],
              ["Close dialog", "Esc"],
            ].map(([label, key]) => (
              <div key={label}>
                <span>{label}</span>
                <kbd>{key}</kbd>
              </div>
            ))}
          </div>
          <p className="hint">
            Use ⌘ instead of Ctrl on macOS. Shortcuts pause while you type.
          </p>
        </Modal>
        {toast && (
          <div
            role={toast.error ? "alert" : "status"}
            className={`toast ${toast.error ? "error" : ""}`}
          >
            {toast.error ? <X size={17} /> : <Check size={17} />}
            <span>{toast.message}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => setToast(null)}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </Tooltip.Provider>
  );
}
function Preview({ onError }: { onError: (s: string) => void }) {
  const s = useStudio(),
    player = useRef<PlayerRef>(null),
    stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState("fit");
  const [muted, setMuted] = useState(false);
  const [controls, setControls] = useState(true);
  const p = s.project;
  const frames = durationOf(p);
  const scene =
    p.scenes.find(
      (sc) => s.frame >= sc.startFrame && s.frame < sc.startFrame + sc.duration,
    ) ?? p.scenes[0];
  const selectedLayer = p.scenes
    .flatMap((sc) => sc.layers)
    .find((l) => s.selected.includes(l.id));
  useEffect(() => {
    const el = player.current;
    if (!el) return;
    const frame = (e: { detail: { frame: number } }) =>
      useStudio.setState({ frame: e.detail.frame });
    const ended = () => s.setPlaying(false);
    el.addEventListener("frameupdate", frame);
    el.addEventListener("ended", ended);
    return () => {
      el.removeEventListener("frameupdate", frame);
      el.removeEventListener("ended", ended);
    };
  }, [p.id]);
  useEffect(() => {
    const el = player.current;
    if (!el) return;
    if (Math.abs(el.getCurrentFrame() - s.frame) > 1)
      el.seekTo(Math.min(frames - 1, s.frame));
  }, [s.frame, frames]);
  useEffect(() => {
    if (s.playing) player.current?.play();
    else player.current?.pause();
  }, [s.playing]);
  useEffect(() => {
    if (muted) player.current?.mute();
    else player.current?.unmute();
  }, [muted]);
  function reposition(e: React.PointerEvent<HTMLElement>) {
    if (!selectedLayer) return;
    const down = { x: e.clientX, y: e.clientY },
      rect = e.currentTarget.getBoundingClientRect(),
      start = { x: selectedLayer.x, y: selectedLayer.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    const el = e.currentTarget;
    let next = start;
    const move = (event: PointerEvent) => {
      next = {
        x: Math.max(
          -200,
          Math.min(
            200,
            start.x + ((event.clientX - down.x) / rect.width) * 100,
          ),
        ),
        y: Math.max(
          -200,
          Math.min(
            200,
            start.y + ((event.clientY - down.y) / rect.height) * 100,
          ),
        ),
      };
      el.style.setProperty(
        "--drag-x",
        `${((next.x - start.x) / 100) * rect.width}px`,
      );
      el.style.setProperty(
        "--drag-y",
        `${((next.y - start.y) / 100) * rect.height}px`,
      );
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      s.updateLayer(selectedLayer.id, next);
      el.style.removeProperty("--drag-x");
      el.style.removeProperty("--drag-y");
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  }
  return (
    <div className="preview">
      <div className="preview-toolbar">
        <span>
          <span className="preview-status" /> LIVE PREVIEW
        </span>
        <div>
          <button
            className="preview-resolution"
            onClick={() => {
              const vertical = p.width < p.height;
              s.edit((p) => {
                p.width = vertical ? 1920 : 1080;
                p.height = vertical ? 1080 : 1920;
              });
            }}
          >
            {p.width < p.height ? "9:16" : "16:9"} <ChevronDown size={12} />
          </button>
          <span className="divider" />
          <button
            className="preview-resolution"
            onClick={() => setScale(scale === "fit" ? "125%" : "fit")}
          >
            {scale === "fit" ? "Fit" : scale}
            <ChevronDown size={12} />
          </button>
          <IconButton
            label="Fullscreen preview"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else void stage.current?.requestFullscreen();
            }}
          >
            <Maximize2 size={14} />
          </IconButton>
        </div>
      </div>
      <div
        className="preview-stage"
        ref={stage}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          try {
            const value = e.dataTransfer.getData("application/nova-asset");
            if (value) {
              const asset = JSON.parse(value) as Asset;
              if (asset.type === "font") return;
              s.addLayer(asset.type, asset);
            }
          } catch {
            onError("This asset could not be added.");
          }
        }}
      >
        <div className="stage-corner top-left" />
        <div className="stage-corner top-right" />
        <div className="stage-corner bottom-left" />
        <div className="stage-corner bottom-right" />
        <div
          className={`canvas-frame ${p.width > p.height ? "landscape" : ""} ${scale === "125%" ? "zoomed" : ""}`}
          style={{ aspectRatio: `${p.width}/${p.height}` }}
        >
          <Player
            key={p.id}
            ref={player}
            component={NovaComposition}
            inputProps={{ project: p }}
            durationInFrames={frames}
            compositionWidth={p.width}
            compositionHeight={p.height}
            fps={p.fps}
            initialFrame={Math.min(s.frame, frames - 1)}
            style={{ width: "100%", height: "100%" }}
            controls={false}
            clickToPlay={false}
            doubleClickToFullscreen={false}
            errorFallback={({ error }) => (
              <div className="composition-error">
                <Film size={26} />
                <h3>Preview needs attention</h3>
                <p>{error.message}</p>
              </div>
            )}
          />
          {s.safeZones && (
            <div className="safe-zone">
              <span>SOCIAL SAFE ZONE</span>
            </div>
          )}
          {selectedLayer && selectedLayer.type !== "audio" && (
            <div className="selection-overlay" onPointerDown={reposition}>
              <div
                style={{
                  left: selectedLayer.x + "%",
                  top: selectedLayer.y + "%",
                  width: selectedLayer.width + "%",
                  height: selectedLayer.height + "%",
                  transform: `translate(calc(-50% + var(--drag-x, 0px)), calc(-50% + var(--drag-y, 0px))) rotate(${selectedLayer.rotation}deg)`,
                }}
              >
                <i />
                <i />
                <i />
                <i />
                <span>{selectedLayer.name}</span>
              </div>
            </div>
          )}
        </div>
        <span className="stage-caption">
          {scene.name} <i /> {p.width} × {p.height}
        </span>
      </div>
      <div className="preview-footer">
        <button
          aria-label="Safe zones"
          className={`safe-zones-button ${s.safeZones ? "active" : ""}`}
          onClick={() => s.toggle("safeZones")}
        >
          <Shield size={14} />
          <span>Safe zones</span>
        </button>
        <div className="playback">
          <IconButton label="Go to beginning" onClick={() => s.setFrame(0)}>
            <SkipBack size={15} />
          </IconButton>
          <IconButton
            label="Previous frame"
            onClick={() => s.setFrame(Math.max(0, s.frame - 1))}
          >
            <ChevronLeft size={18} />
          </IconButton>
          <button
            className="play-button"
            aria-label={s.playing ? "Pause preview" : "Play preview"}
            onClick={() => s.setPlaying(!s.playing)}
          >
            {s.playing ? (
              <Pause size={17} fill="currentColor" />
            ) : (
              <Play size={17} fill="currentColor" />
            )}
          </button>
          <IconButton
            label="Next frame"
            onClick={() => s.setFrame(Math.min(frames - 1, s.frame + 1))}
          >
            <ChevronRight size={18} />
          </IconButton>
          <IconButton label="Go to end" onClick={() => s.setFrame(frames - 1)}>
            <SkipForward size={15} />
          </IconButton>
        </div>
        <div className="preview-time">
          <b>{timecode(s.frame, p.fps)}</b>
          <span>/</span>
          <span>{timecode(frames, p.fps)}</span>
        </div>
      </div>
    </div>
  );
}
