import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Player } from "@remotion/player";
import {
  Plus,
  Upload,
  Search,
  Image,
  Type,
  Music2,
  Film,
  Box,
  Layers,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  Folder,
  Check,
  LoaderCircle,
} from "lucide-react";
import { NovaComposition } from "../../../packages/video-engine";
import {
  createScene,
  templates,
  createProject,
} from "../../../packages/templates";
import {
  durationOf,
  animations,
  type Project,
  type Asset,
  type Scene,
} from "../../../packages/project-schema";
import { useStudio } from "./store";
import { api } from "./api";
import { SearchInput, IconButton, Empty } from "./ui";
export function ProjectThumbnail({
  project,
  frame = 65,
  controls = false,
  className = "",
}: {
  project: Project;
  frame?: number;
  controls?: boolean;
  className?: string;
}) {
  return (
    <div className={`project-thumbnail ${className}`}>
      <Player
        component={NovaComposition}
        inputProps={{ project }}
        durationInFrames={durationOf(project)}
        fps={project.fps}
        compositionWidth={project.width}
        compositionHeight={project.height}
        initialFrame={Math.min(frame, durationOf(project) - 1)}
        style={{ width: "100%", height: "100%" }}
        controls={controls}
        loop={controls}
        autoPlay={controls}
        clickToPlay={controls}
        doubleClickToFullscreen={false}
        initiallyMuted
        numberOfSharedAudioTags={0}
      />
    </div>
  );
}
export function TemplateArtwork({
  type,
  accent,
}: {
  type: string;
  accent: string;
}) {
  return (
    <div
      className={`template-art art-${type}`}
      style={{ "--art-accent": accent } as React.CSSProperties}
    >
      <div className="art-orbit" />
      <div className="art-object">
        {type === "typography" ? (
          <b>
            MAKE
            <br />
            IT MOVE.
          </b>
        ) : type === "brand" ? (
          <span className="art-star">✳</span>
        ) : type === "mobile" ? (
          <div className="art-phone">
            <i />
            <span />
            <span />
            <span />
          </div>
        ) : type === "education" ? (
          <div className="art-diagram">
            <i />
            <i />
            <i />
          </div>
        ) : type === "orbit" || type === "product" || type === "tech" ? (
          <div className="art-cube">
            <i />
            <i />
            <i />
          </div>
        ) : (
          <div className="art-browser">
            <div>
              •••<small>nova.design</small>
            </div>
            <section>
              <span />
              <b>
                {type === "saas" ? "A clearer picture." : "Ideas come alive."}
              </b>
              <div className="art-bars">
                {[40, 65, 50, 80, 60, 95].map((h, i) => (
                  <i key={i} style={{ height: h + "%" }} />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
      <div className="art-floor" />
    </div>
  );
}
export function AssetGrid({
  compact = false,
  onError,
}: {
  compact?: boolean;
  onError: (m: string) => void;
}) {
  const qc = useQueryClient(),
    s = useStudio();
  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: api.assets,
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  async function upload(files: FileList | null) {
    if (!files) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        await api.upload(f);
      }
      await qc.invalidateQueries({ queryKey: ["assets"] });
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  return (
    <div
      className={`asset-library ${compact ? "compact" : ""}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void upload(e.dataTransfer.files);
      }}
    >
      <input
        ref={file}
        type="file"
        hidden
        multiple
        accept="image/*,video/mp4,video/webm,audio/*,.glb,.woff,.woff2,.ttf"
        onChange={(e) => void upload(e.target.files)}
      />
      <button
        className="upload-zone"
        onClick={() => file.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <LoaderCircle size={22} className="spin" />
        ) : (
          <Upload size={22} />
        )}
        <b>{uploading ? "Importing your assets…" : "Drop files to import"}</b>
        <span>Images, video, audio, fonts & 3D</span>
        <small>or browse your computer · up to 100 MB</small>
      </button>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Find an asset…"
      />
      <div className="filter-chips">
        {["All", "image", "video", "audio", "model", "font"].map((t) => (
          <button
            key={t}
            className={t === filter ? "active" : ""}
            onClick={() => setFilter(t)}
          >
            {t === "All" ? t : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="asset-grid">
        {assets
          .filter(
            (a) =>
              (filter === "All" || a.type === filter) &&
              a.name.toLowerCase().includes(search.toLowerCase()),
          )
          .map((a) => (
            <button
              draggable
              onDragStart={(e) =>
                e.dataTransfer.setData(
                  "application/nova-asset",
                  JSON.stringify(a),
                )
              }
              className="asset-card"
              key={a.id}
              title={`Add ${a.name} to selected scene`}
              onClick={() => {
                if (a.type === "font") {
                  s.edit((p) => {
                    if (!p.assets.some((x) => x.id === a.id)) p.assets.push(a);
                  });
                  const id = s.selected[0];
                  if (
                    s.project.scenes.some((sc) =>
                      sc.layers.some((l) => l.id === id && l.type === "text"),
                    )
                  ) {
                    s.updateLayer(id, { fontFamily: "asset:" + a.id });
                  } else
                    onError(
                      "Font added to this project. Select a text layer, then choose it in Typeface.",
                    );
                  return;
                }
                s.addLayer(a.type === "model" ? "model" : a.type, a);
              }}
            >
              <div>
                {a.type === "image" ? (
                  <img src={a.path} alt={a.name} />
                ) : a.type === "video" ? (
                  <Film />
                ) : a.type === "audio" ? (
                  <Music2 />
                ) : a.type === "model" ? (
                  <Box />
                ) : (
                  <Type />
                )}
              </div>
              <b>{a.name}</b>
              <small>
                {(a.size / 1024 / 1024).toFixed(1)} MB · {a.type}
              </small>
            </button>
          ))}
      </div>
      {!assets.length && (
        <p className="hint center">
          Your ideas, your assets.
          <br />
          Everything stays on this computer.
        </p>
      )}
    </div>
  );
}
export function LeftPanel({ onError }: { onError: (s: string) => void }) {
  const s = useStudio();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const panel = s.panel;
  const selected =
    s.project.scenes.find(
      (sc) =>
        s.selected.includes(sc.id) ||
        sc.layers.some((l) => s.selected.includes(l.id)),
    ) ?? s.project.scenes[0];
  return (
    <aside className="left-panel">
      <div className="panel-heading">
        <span>
          {panel === "scenes" ? (
            <Layers size={15} />
          ) : panel === "assets" ? (
            <Image size={15} />
          ) : panel === "text" ? (
            <Type size={15} />
          ) : panel === "audio" ? (
            <Music2 size={15} />
          ) : (
            <Sparkles size={15} />
          )}{" "}
          {panel === "scenes"
            ? "Scene library"
            : panel === "assets"
              ? "Your assets"
              : panel === "text"
                ? "Typography"
                : panel === "audio"
                  ? "Sound studio"
                  : "Motion library"}
        </span>
        <IconButton
          label={panel === "scenes" ? "Add a scene" : "Search library"}
          onClick={() =>
            panel === "scenes" ? setAdding(!adding) : setSearch("")
          }
        >
          <Plus size={15} />
        </IconButton>
      </div>
      <div className="left-scroll">
        {panel === "scenes" ? (
          <>
            <div className="library-intro">
              <span className="eyebrow">YOUR STORY, FRAME BY FRAME</span>
              <h3>
                A little motion.
                <br />A lasting impression.
              </h3>
            </div>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search scenes…"
            />
            <div className="section-label">
              PROJECT SCENES{" "}
              <span>{s.project.scenes.length.toString().padStart(2, "0")}</span>
            </div>
            <div className="scene-list">
              {s.project.scenes
                .filter((sc) =>
                  sc.name.toLowerCase().includes(search.toLowerCase()),
                )
                .sort((a, b) => a.startFrame - b.startFrame)
                .map((sc, i) => (
                  <button
                    aria-label={`Scene ${i + 1}: ${sc.name}`}
                    className={`scene-card ${s.selected.includes(sc.id) || selected.id === sc.id ? "selected" : ""}`}
                    key={sc.id}
                    onClick={() => {
                      s.select(sc.id);
                      s.setFrame(sc.startFrame + Math.min(45, sc.duration - 1));
                    }}
                  >
                    <div className="scene-thumbnail">
                      <ProjectThumbnail
                        project={s.project}
                        frame={sc.startFrame + Math.min(65, sc.duration - 1)}
                      />
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      <span className="scene-length">
                        {(sc.duration / s.project.fps).toFixed(1)}s
                      </span>
                    </div>
                    <div className="scene-card-text">
                      <b>{i === 0 ? "The first impression" : sc.name}</b>
                      <span>
                        {sc.type.replace("-", " ")} <span>·</span>{" "}
                        {sc.layers.length + 1} layers
                      </span>
                    </div>
                    <ChevronRight size={14} />
                  </button>
                ))}
            </div>
            <button
              className="button add-scene full"
              onClick={() => setAdding(!adding)}
            >
              <Plus size={15} /> Add scene
            </button>
            {adding && (
              <div className="scene-type-grid">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      s.addScene(
                        createScene(t.type, durationOf(s.project), 150),
                      );
                      setAdding(false);
                    }}
                  >
                    <span style={{ background: t.accent }} />
                    {t.name}
                  </button>
                ))}
              </div>
            )}
            <div className="library-tip">
              <span className="tip-icon">
                <Sparkles size={17} />
              </span>
              <b>Big ideas start with a scene.</b>
              <p>
                Explore cinematic templates and make something that feels like
                you.
              </p>
              <button onClick={() => s.setPage("templates")}>
                Explore templates <ArrowUpRight size={13} />
              </button>
            </div>
          </>
        ) : panel === "assets" ? (
          <AssetGrid compact onError={onError} />
        ) : panel === "text" ? (
          <>
            <div className="library-intro">
              <span className="eyebrow">LET YOUR WORDS MOVE</span>
              <h3>Say it beautifully.</h3>
              <p>Editable type. Frame-perfect motion.</p>
            </div>
            {[
              {
                name: "Editorial headline",
                text: "Ideas worth\nlooking at.",
                font: 100,
                weight: 600,
              },
              {
                name: "Kinetic statement",
                text: "MAKE IT\nMATTER.",
                font: 130,
                weight: 800,
              },
              {
                name: "Persian headline",
                text: "ایده‌های بزرگ،\nاجرای متفاوت.",
                font: 88,
                weight: 700,
              },
              {
                name: "Supporting copy",
                text: "Thoughtfully designed.\nBeautifully connected.",
                font: 48,
                weight: 400,
              },
              {
                name: "Lower third",
                text: "NOVA STUDIO\nDesign in motion",
                font: 44,
                weight: 500,
              },
              {
                name: "Call to action",
                text: "Let’s build what’s next.",
                font: 68,
                weight: 600,
              },
            ].map((t) => (
              <button
                className="type-preset"
                key={t.name}
                onClick={() => {
                  s.addLayer("text");
                  const id = useStudio.getState().selected[0];
                  s.updateLayer(id, {
                    text: t.text,
                    name: t.name,
                    fontSize: t.font,
                    fontWeight: t.weight,
                    fontFamily: t.name.includes("Persian")
                      ? "Vazirmatn"
                      : "Inter",
                    direction: t.name.includes("Persian") ? "rtl" : "auto",
                  });
                }}
              >
                <span
                  style={{
                    fontSize: Math.max(16, t.font / 5),
                    fontWeight: t.weight,
                  }}
                  dir="auto"
                >
                  {t.text}
                </span>
                <small>
                  {t.name}
                  <Plus size={13} />
                </small>
              </button>
            ))}
          </>
        ) : panel === "motion" ? (
          <>
            <div className="library-intro">
              <span className="eyebrow">A LANGUAGE OF MOVEMENT</span>
              <h3>Find your rhythm.</h3>
              <p>Select a layer, then apply a preset.</p>
            </div>
            <div className="motion-grid library-motion">
              {animations.map((a) => (
                <button
                  key={a}
                  onClick={() => {
                    const id = s.selected[0];
                    if (
                      !s.project.scenes.some((sc) =>
                        sc.layers.some((l) => l.id === id),
                      )
                    ) {
                      onError(
                        "Select a text or media layer to apply a motion preset.",
                      );
                      return;
                    }
                    s.updateLayer(id, { animation: a });
                  }}
                >
                  <span className={`motion-symbol motion-${a}`}>◈</span>
                  {a}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="library-intro">
              <span className="eyebrow">EVERY FRAME HAS A FEELING</span>
              <h3>Give it a soundtrack.</h3>
              <p>
                Import your music, voice-over, or sound effects. Add audio to a
                scene, then adjust trim, volume, and keyframes.
              </p>
            </div>
            <button
              className="button full"
              onClick={() => s.setPanel("assets")}
            >
              <Upload size={15} /> Import audio
            </button>
            <div className="sound-info">
              <Music2 size={32} />
              <h4>Your sound. Your story.</h4>
              <p>
                No commercial music is bundled. Import audio you own or have
                permission to use.
              </p>
            </div>
          </>
        )}
      </div>
      <footer className="library-footer">
        <span className="local-dot" /> Local workspace{" "}
        <span>PRIVATE BY DESIGN</span>
      </footer>
    </aside>
  );
}
