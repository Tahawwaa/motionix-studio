import { useRef, useState } from "react";
import {
  Layers,
  Type,
  Image,
  Music2,
  Box,
  Film,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  Scissors,
  Copy,
  Trash2,
  Magnet,
  ChevronsRight,
  ZoomIn,
  ZoomOut,
  Plus,
  Diamond,
  Group,
  ChevronDown,
  MousePointer2,
} from "lucide-react";
import { AudioWaveform } from "./AudioWaveform";
import { useStudio } from "./store";
import { durationOf, uid, type Track } from "../../../packages/project-schema";
import { IconButton } from "./ui";
const icons = {
  scene: Layers,
  text: Type,
  image: Image,
  video: Film,
  audio: Music2,
  shape: Box,
  model: Box,
  effect: Diamond,
  camera: Box,
};
export const timecode = (f: number, fps: number) =>
  `${String(Math.floor(f / fps / 60)).padStart(2, "0")}:${String(Math.floor(f / fps) % 60).padStart(2, "0")}:${String(f % fps).padStart(2, "0")}`;
export function Timeline() {
  const s = useStudio(),
    p = s.project;
  const scroller = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{
    id: string;
    delta: number;
    mode: "move" | "trim";
  } | null>(null);
  const px = 0.95 * s.zoom,
    frames = durationOf(p),
    width = Math.max(850, frames * px + 160);
  const scenes = p.scenes;
  const tracks = p.tracks;
  const seek = (e: React.PointerEvent<HTMLElement>) => {
    const target = scroller.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    s.setFrame(
      Math.max(
        0,
        Math.min(
          frames - 1,
          Math.round((e.clientX - rect.left + target.scrollLeft - 168) / px),
        ),
      ),
    );
  };
  function scrub(e: React.PointerEvent<HTMLElement>) {
    e.preventDefault();
    seek(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    const el = e.currentTarget;
    const move = (event: PointerEvent) =>
      seek(event as unknown as React.PointerEvent<HTMLElement>);
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  }
  function beginDrag(
    e: React.PointerEvent<HTMLElement>,
    id: string,
    start: number,
    duration: number,
    locked: boolean,
    mode: "move" | "trim",
  ) {
    if (locked) return;
    e.stopPropagation();
    if (!s.selected.includes(id) || e.shiftKey) s.select(id, e.shiftKey);
    const down = e.clientX;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    let delta = 0;
    const move = (ev: PointerEvent) => {
      delta = Math.round((ev.clientX - down) / px);
      setDrag({ id, delta, mode });
    };
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      setDrag(null);
      if (delta) {
        if (mode === "move") s.move(id, start + delta);
        else s.trim(id, duration + delta);
      }
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
  }
  function trackUpdate(t: Track, patch: Partial<Track>) {
    s.edit((p) =>
      Object.assign(
        p.tracks.find((x) => x.id === t.id)!,
        patch,
      ),
    );
  }
  return (
    <section className="timeline">
      <header className="timeline-toolbar">
        <div className="timeline-title">
          <Layers size={15} />
          <b>Timeline</b>
          <span>{tracks.length} tracks</span>
        </div>
        <div className="timeline-tools">
          <IconButton label="Select tool" active>
            <MousePointer2 size={14} />
          </IconButton>
          <IconButton
            label="Split at playhead (S)"
            onClick={s.split}
            disabled={!s.selected.length}
          >
            <Scissors size={15} />
          </IconButton>
          <IconButton
            label="Duplicate (Ctrl D)"
            onClick={s.duplicate}
            disabled={!s.selected.length}
          >
            <Copy size={14} />
          </IconButton>
          <IconButton
            label="Delete selection"
            onClick={s.remove}
            disabled={!s.selected.length}
          >
            <Trash2 size={14} />
          </IconButton>
          <span className="divider" />
          <IconButton
            label="Group selected layers"
            onClick={s.group}
            disabled={s.selected.length < 2}
          >
            <Group size={15} />
          </IconButton>
          <IconButton
            label="Snapping"
            active={s.snapping}
            onClick={() => s.toggle("snapping")}
          >
            <Magnet size={15} />
          </IconButton>
          <IconButton
            label="Ripple editing"
            active={s.ripple}
            onClick={() => s.toggle("ripple")}
          >
            <ChevronsRight size={15} />
          </IconButton>
        </div>
        <div className="timeline-zoom">
          <span>{timecode(s.frame, p.fps)}</span>
          <IconButton
            label="Zoom out timeline"
            onClick={() => s.setZoom(s.zoom - 0.25)}
          >
            <ZoomOut size={14} />
          </IconButton>
          <input
            aria-label="Timeline zoom"
            type="range"
            min=".5"
            max="5"
            step=".25"
            value={s.zoom}
            onChange={(e) => s.setZoom(+e.target.value)}
          />
          <IconButton
            label="Zoom in timeline"
            onClick={() => s.setZoom(s.zoom + 0.25)}
          >
            <ZoomIn size={14} />
          </IconButton>
          <span>{Math.round(s.zoom * 100)}%</span>
        </div>
      </header>
      <div className="timeline-scroll" ref={scroller}>
        <div className="timeline-content" style={{ width: width + 168 }}>
          <div className="timeline-ruler">
            <div className="ruler-label">
              <ChevronDown size={12} /> Tracks{" "}
              <button
                onClick={() =>
                  s.edit((p) =>
                    p.tracks.push({
                      id: uid(),
                      name: "New audio",
                      type: "audio",
                      locked: false,
                      hidden: false,
                      muted: false,
                      solo: false,
                    }),
                  )
                }
                aria-label="Add audio track"
              >
                <Plus size={14} />
              </button>
            </div>
            <div
              className="ruler-ticks"
              style={{ width }}
              onPointerDown={scrub}
            >
              {Array.from(
                { length: Math.ceil(frames / p.fps / 2) + 3 },
                (_, i) => (
                  <span key={i} style={{ left: i * 2 * p.fps * px }}>
                    {String(Math.floor((i * 2) / 60)).padStart(2, "0")}:
                    {String((i * 2) % 60).padStart(2, "0")}
                  </span>
                ),
              )}
            </div>
          </div>
          {tracks.map((track) => {
            const Icon = icons[track.type];
            const clips =
              track.type === "scene"
                ? scenes.map((sc) => ({
                    id: sc.id,
                    name: sc.name,
                    start: sc.startFrame,
                    duration: sc.duration,
                    color: sc.accent,
                    type: "scene",
                    keyframes: [],
                    assetId: undefined as string | undefined,
                    trimStart: 0,
                  }))
                : scenes.flatMap((sc) =>
                    sc.layers
                      .filter((l) => l.trackId === track.id)
                      .map((l) => ({
                        id: l.id,
                        name: l.name,
                        start: sc.startFrame + l.startFrame,
                        duration: l.duration,
                        color:
                          l.type === "text"
                            ? "#ab8aec"
                            : l.type === "audio"
                              ? "#4cb4a0"
                              : l.type === "shape"
                                ? "#edbd6b"
                                : "#6a9ce7",
                        type: l.type,
                        keyframes: l.keyframes,
                        assetId: l.assetId,
                        trimStart: l.trimStart,
                      })),
                  );
            return (
              <div
                className={`track-row ${track.hidden ? "track-hidden" : ""}`}
                key={track.id}
              >
                <div className="track-label">
                  <Icon size={14} />
                  <span title={track.name}>{track.name}</span>
                  <div className="track-actions">
                    <IconButton
                      label={`${track.locked ? "Unlock" : "Lock"} ${track.name}`}
                      onClick={() =>
                        trackUpdate(track, { locked: !track.locked })
                      }
                    >
                      {track.locked ? <Lock size={11} /> : <Unlock size={11} />}
                    </IconButton>
                    {track.type === "audio" ? (
                      <>
                        <IconButton
                          label={`Mute ${track.name}`}
                          active={track.muted}
                          onClick={() =>
                            trackUpdate(track, { muted: !track.muted })
                          }
                        >
                          {track.muted ? (
                            <VolumeX size={12} />
                          ) : (
                            <Volume2 size={12} />
                          )}
                        </IconButton>
                        <button
                          className={track.solo ? "solo active" : "solo"}
                          aria-label={`Solo ${track.name}`}
                          onClick={() =>
                            trackUpdate(track, { solo: !track.solo })
                          }
                        >
                          S
                        </button>
                      </>
                    ) : (
                      <IconButton
                        label={`${track.hidden ? "Show" : "Hide"} ${track.name}`}
                        onClick={() =>
                          trackUpdate(track, { hidden: !track.hidden })
                        }
                      >
                        {track.hidden ? (
                          <EyeOff size={12} />
                        ) : (
                          <Eye size={12} />
                        )}
                      </IconButton>
                    )}
                  </div>
                </div>
                <div
                  className="track-lane"
                  style={{ width }}
                  onPointerDown={(e) => {
                    if (e.target === e.currentTarget) seek(e);
                  }}
                >
                  {clips.map((c) => (
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={`Clip ${c.name}`}
                      aria-selected={s.selected.includes(c.id)}
                      key={c.id}
                      className={`timeline-clip clip-${c.type} ${s.selected.includes(c.id) ? "selected" : ""} ${track.locked ? "locked" : ""}`}
                      style={
                        {
                          left:
                            (c.start +
                              (drag?.id === c.id && drag.mode === "move"
                                ? drag.delta
                                : 0)) *
                            px,
                          width: Math.max(
                            8,
                            (c.duration +
                              (drag?.id === c.id && drag.mode === "trim"
                                ? drag.delta
                                : 0)) *
                              px -
                              3,
                          ),
                          "--clip-color": c.color,
                        } as React.CSSProperties
                      }
                      onPointerDown={(e) =>
                        beginDrag(
                          e,
                          c.id,
                          c.start,
                          c.duration,
                          track.locked,
                          "move",
                        )
                      }

                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          s.select(c.id);
                          s.setFrame(c.start);
                        }
                      }}
                      onDoubleClick={() => {
                        s.select(c.id);
                        s.setFrame(c.start);
                      }}
                    >
                      <span className="clip-grip" />
                      <Icon size={12} />
                      <span>{c.name}</span>
                      {c.type === "audio" &&
                        c.assetId &&
                        p.assets.find((a) => a.id === c.assetId) && (
                          <AudioWaveform
                            src={p.assets.find((a) => a.id === c.assetId)!.path}
                            trimStart={c.trimStart}
                            duration={c.duration}
                            fps={p.fps}
                          />
                        )}
                      {c.keyframes.map((k) => (
                        <Diamond
                          key={k.id}
                          size={8}
                          className="timeline-keyframe"
                          style={{ left: k.frame * px }}
                        />
                      ))}
                      <div
                        className="clip-trim"
                        onPointerDown={(e) =>
                          beginDrag(
                            e,
                            c.id,
                            c.start,
                            c.duration,
                            track.locked,
                            "trim",
                          )
                        }
                      />
                    </div>
                  ))}
                  {!clips.length && (
                    <span className="empty-track-label">
                      {track.type === "audio"
                        ? "Drop in a soundtrack"
                        : track.type === "text"
                          ? "Add text to tell your story"
                          : track.type === "image"
                            ? "Your images & video go here"
                            : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div className="playhead" style={{ left: 168 + s.frame * px }}>
            <div onPointerDown={scrub} />
          </div>
        </div>
      </div>
      <footer className="timeline-status">
        <span>
          <span className="status-dot" />{" "}
          {s.playing ? "Playing" : "Ready to create"}
        </span>
        <span>
          {p.width} × {p.height} <i /> {p.fps} FPS <i />{" "}
          {(frames / p.fps).toFixed(1)} seconds <i /> {s.project.scenes.length}{" "}
          scenes
        </span>
        <span>Scroll to explore · Shift + click to select</span>
      </footer>
    </section>
  );
}
