import { useState } from "react";
import {
  SlidersHorizontal,
  ChevronDown,
  Diamond,
  Plus,
  Trash2,
  Layers,
  Eye,
  Copy,
  Camera,
  Move3D,
  Sparkles,
  Type,
  Music2,
} from "lucide-react";
import { useStudio } from "./store";
import {
  animations,
  effectTypes,
  uid,
  type Layer,
  type Scene,
  type Keyframe,
} from "../../../packages/project-schema";
import { IconButton, Field } from "./ui";
export function Inspector() {
  const s = useStudio();
  const scene =
    s.project.scenes.find(
      (sc) =>
        s.selected.includes(sc.id) ||
        sc.layers.some((l) => s.selected.includes(l.id)),
    ) ??
    s.project.scenes.find(
      (sc) => s.frame >= sc.startFrame && s.frame < sc.startFrame + sc.duration,
    ) ??
    s.project.scenes[0];
  const layer = scene.layers.find((l) => s.selected.includes(l.id));
  const [tab, setTab] = useState("Design");
  const [kfProp, setKfProp] = useState<Keyframe["property"]>("opacity");
  const [kfValue, setKfValue] = useState(1);
  const [kfEase, setKfEase] = useState<Keyframe["easing"]>("ease-in-out");
  const update = (patch: Partial<Layer>) =>
    layer && s.updateLayer(layer.id, patch);
  const sc = (patch: Partial<Scene>) => s.updateScene(scene.id, patch);
  const item = layer ?? scene;
  return (
    <aside className="inspector">
      <div className="panel-heading">
        <span>
          <SlidersHorizontal size={15} /> Inspector
        </span>
        <span className="tag">{layer ? "LAYER" : "SCENE"}</span>
      </div>
      <div className="inspector-tabs">
        {["Design", "Motion"].map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="inspector-scroll">
        <div className="inspector-selection">
          <span className="selection-icon">
            {layer?.type === "text" ? (
              <Type size={18} />
            ) : layer?.type === "audio" ? (
              <Music2 size={18} />
            ) : (
              <Layers size={18} />
            )}
          </span>
          <div>
            <input
              aria-label="Selected item name"
              value={item.name}
              onChange={(e) =>
                layer
                  ? update({ name: e.target.value })
                  : sc({ name: e.target.value })
              }
            />
            <small>
              {layer ? `${layer.type} layer` : `${scene.type} composition`}
            </small>
          </div>
          <ChevronDown size={14} />
        </div>
        {tab === "Design" ? (
          <>
            <section className="property-section">
              <h4>
                {layer ? "Transform" : "Composition"}
                <Move3D size={14} />
              </h4>
              {layer ? (
                <>
                  <div className="field-pair">
                    <Num
                      label="X position %"
                      value={layer.x}
                      onChange={(x) => update({ x })}
                    />
                    <Num
                      label="Y position %"
                      value={layer.y}
                      onChange={(y) => update({ y })}
                    />
                    <Num
                      label="Width %"
                      value={layer.width}
                      onChange={(width) => update({ width })}
                      min={1}
                      max={400}
                    />
                    <Num
                      label="Height %"
                      value={layer.height}
                      onChange={(height) => update({ height })}
                      min={1}
                      max={400}
                    />
                    <Num
                      label="Rotation °"
                      value={layer.rotation}
                      onChange={(rotation) => update({ rotation })}
                    />
                    <Num
                      label="Scale"
                      value={layer.scale}
                      onChange={(scale) => update({ scale })}
                      step={0.05}
                      min={0.01}
                      max={20}
                    />
                  </div>
                  <Field label="Opacity">
                    <div className="range-value">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step=".01"
                        value={layer.opacity}
                        onChange={(e) => update({ opacity: +e.target.value })}
                      />
                      <span>{Math.round(layer.opacity * 100)}%</span>
                    </div>
                  </Field>
                  <Field label="Visibility">
                    <button
                      className="text-button"
                      onClick={() => update({ visible: !layer.visible })}
                    >
                      <Eye size={14} />
                      {layer.visible ? "Visible" : "Hidden"}
                    </button>
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Scene name">
                    <input
                      value={scene.name}
                      onChange={(e) => sc({ name: e.target.value })}
                    />
                  </Field>
                  <div className="field-pair">
                    <Num
                      label="Start · seconds"
                      value={scene.startFrame / s.project.fps}
                      min={0}
                      step={1 / s.project.fps}
                      onChange={(n) =>
                        sc({ startFrame: Math.round(n * s.project.fps) })
                      }
                    />
                    <Num
                      label="Duration · seconds"
                      value={scene.duration / s.project.fps}
                      min={1 / s.project.fps}
                      step={1 / s.project.fps}
                      onChange={(n) => s.trim(scene.id, n * s.project.fps)}
                    />
                  </div>
                </>
              )}
            </section>
            <section className="property-section">
              <h4>
                {layer?.type === "audio" ? "Sound" : "Appearance"}
                <span className="property-dot" />
              </h4>
              {(!layer || layer.type === "text") && (
                <>
                  <Field label={layer ? "Text content" : "Headline"}>
                    <textarea
                      dir="auto"
                      rows={3}
                      value={layer ? layer.text : scene.title}
                      onChange={(e) =>
                        layer
                          ? update({ text: e.target.value })
                          : sc({ title: e.target.value })
                      }
                    />
                  </Field>
                  {!layer && (
                    <Field label="Supporting text">
                      <textarea
                        dir="auto"
                        rows={2}
                        value={scene.subtitle}
                        onChange={(e) => sc({ subtitle: e.target.value })}
                      />
                    </Field>
                  )}
                </>
              )}
              {layer && layer.type === "text" && (
                <>
                  <Field label="Typeface">
                    <select
                      value={layer.fontFamily}
                      onChange={(e) =>
                        update({
                          fontFamily: e.target.value as Layer["fontFamily"],
                        })
                      }
                    >
                      {["Inter", "Vazirmatn", "Georgia", "monospace"].map(
                        (f) => (
                          <option key={f}>{f}</option>
                        ),
                      )}
                      {s.project.assets
                        .filter((a) => a.type === "font")
                        .map((a) => (
                          <option key={a.id} value={"asset:" + a.id}>
                            {a.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <div className="field-pair">
                    <Num
                      label="Size"
                      value={layer.fontSize}
                      min={8}
                      max={500}
                      onChange={(fontSize) => update({ fontSize })}
                    />
                    <Field label="Weight">
                      <select
                        value={layer.fontWeight}
                        onChange={(e) =>
                          update({ fontWeight: +e.target.value })
                        }
                      >
                        {[300, 400, 500, 600, 700, 800, 900].map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="field-pair">
                    <Field label="Direction">
                      <select
                        value={layer.direction}
                        onChange={(e) =>
                          update({
                            direction: e.target.value as Layer["direction"],
                          })
                        }
                      >
                        <option value="auto">Auto</option>
                        <option value="rtl">Persian · RTL</option>
                        <option value="ltr">English · LTR</option>
                      </select>
                    </Field>
                    <Field label="Alignment">
                      <select
                        value={layer.align}
                        onChange={(e) =>
                          update({ align: e.target.value as Layer["align"] })
                        }
                      >
                        {["left", "center", "right"].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </>
              )}
              {layer?.type === "audio" ? (
                <>
                  <Num
                    label="Volume"
                    value={layer.volume}
                    onChange={(volume) => update({ volume })}
                    min={0}
                    max={2}
                    step={0.05}
                  />
                  <Num
                    label="Source trim · frames"
                    value={layer.trimStart}
                    onChange={(n) => update({ trimStart: Math.round(n) })}
                    min={0}
                  />
                </>
              ) : (
                <Color
                  label={layer ? "Fill color" : "Accent color"}
                  value={layer ? layer.color : scene.accent}
                  onChange={(color) =>
                    layer ? update({ color }) : sc({ accent: color })
                  }
                />
              )}
              {!layer && (
                <Color
                  label="Background"
                  value={scene.background}
                  onChange={(background) => sc({ background })}
                />
              )}
            </section>
            {!layer && (
              <section className="property-section">
                <h4>
                  Camera
                  <Camera size={14} />
                </h4>
                <Field label="Movement">
                  <select
                    value={scene.camera.path}
                    onChange={(e) =>
                      sc({
                        camera: {
                          ...scene.camera,
                          path: e.target.value as Scene["camera"]["path"],
                        },
                      })
                    }
                  >
                    {[
                      "orbit",
                      "dolly-in",
                      "dolly-out",
                      "truck",
                      "crane",
                      "static",
                    ].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Field>
                <div className="field-pair">
                  <Num
                    label="Intensity"
                    value={scene.camera.intensity}
                    min={0}
                    max={3}
                    step={0.1}
                    onChange={(intensity) =>
                      sc({ camera: { ...scene.camera, intensity } })
                    }
                  />
                  <Num
                    label="Field of view"
                    value={scene.camera.fov}
                    min={15}
                    max={120}
                    onChange={(fov) => sc({ camera: { ...scene.camera, fov } })}
                  />
                </div>
              </section>
            )}
            <section className="property-section">
              <h4>
                Effects
                <Sparkles size={14} />
              </h4>
              <div className="effect-pills">
                {effectTypes.map((e) => (
                  <button
                    key={e}
                    className={scene.effects.includes(e) ? "enabled" : ""}
                    onClick={() =>
                      sc({
                        effects: scene.effects.includes(e)
                          ? scene.effects.filter((x) => x !== e)
                          : [...scene.effects, e],
                      })
                    }
                  >
                    {e.replace("-", " ")}
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="property-section">
              <h4>
                Entrance animation
                <Sparkles size={14} />
              </h4>
              {layer ? (
                <div className="motion-grid">
                  {animations.map((a) => (
                    <button
                      key={a}
                      onClick={() => update({ animation: a })}
                      className={layer.animation === a ? "selected" : ""}
                    >
                      <span className={`motion-symbol motion-${a}`}>◈</span>
                      {a}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <Field label="Scene transition">
                    <select
                      value={scene.transition}
                      onChange={(e) =>
                        sc({
                          transition: e.target.value as Scene["transition"],
                        })
                      }
                    >
                      {[
                        "fade",
                        "slide",
                        "zoom",
                        "blur",
                        "wipe",
                        "flash",
                        "glitch",
                        "rotate",
                        "none",
                      ].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </Field>
                  <Num
                    label="Transition · frames"
                    min={0}
                    max={120}
                    value={scene.transitionDuration}
                    onChange={(n) => sc({ transitionDuration: Math.round(n) })}
                  />
                  <p className="hint">
                    Select a layer to animate its properties with keyframes.
                  </p>
                </>
              )}
            </section>
            {layer && (
              <section className="property-section">
                <h4>
                  Keyframes
                  <Diamond size={14} />
                </h4>
                <Field label="Property">
                  <select
                    value={kfProp}
                    onChange={(e) =>
                      setKfProp(e.target.value as Keyframe["property"])
                    }
                  >
                    {[
                      "x",
                      "y",
                      "scale",
                      "rotation",
                      "opacity",
                      "blur",
                      "fontSize",
                      "volume",
                    ].map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </Field>
                <Num
                  label="Value"
                  value={kfValue}
                  onChange={setKfValue}
                  step={0.1}
                />
                <Field label="Interpolation">
                  <select
                    value={kfEase}
                    onChange={(e) =>
                      setKfEase(e.target.value as Keyframe["easing"])
                    }
                  >
                    {[
                      "linear",
                      "ease-in",
                      "ease-out",
                      "ease-in-out",
                      "spring",
                    ].map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </Field>
                <button
                  className="button full"
                  onClick={() =>
                    update({
                      keyframes: [
                        ...layer.keyframes,
                        {
                          id: uid(),
                          frame: Math.max(
                            0,
                            Math.min(
                              layer.duration - 1,
                              s.frame - scene.startFrame - layer.startFrame,
                            ),
                          ),
                          property: kfProp,
                          value: kfValue,
                          easing: kfEase,
                        },
                      ],
                    })
                  }
                >
                  <Plus size={14} /> Add at playhead
                </button>
                <div className="keyframe-list">
                  {layer.keyframes.map((k) => (
                    <div key={k.id}>
                      <Diamond size={12} />
                      <button
                        onClick={() =>
                          s.setFrame(
                            scene.startFrame + layer.startFrame + k.frame,
                          )
                        }
                      >
                        {k.property} · {k.frame}f · {k.value}
                      </button>
                      <IconButton
                        label="Delete keyframe"
                        onClick={() =>
                          update({
                            keyframes: layer.keyframes.filter(
                              (x) => x.id !== k.id,
                            ),
                          })
                        }
                      >
                        <Trash2 size={12} />
                      </IconButton>
                    </div>
                  ))}
                </div>
                {layer.keyframes.length > 1 && (
                  <svg
                    className="keyframe-graph"
                    viewBox="0 0 240 80"
                    aria-label="Keyframe value graph"
                  >
                    <path
                      d="M0 40H240 M0 0V80 M60 0V80 M120 0V80 M180 0V80"
                      stroke="#27272f"
                    />
                    <polyline
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="2"
                      points={layer.keyframes
                        .filter((k) => k.property === kfProp)
                        .sort((a, b) => a.frame - b.frame)
                        .map(
                          (k) =>
                            `${(k.frame / layer.duration) * 240},${70 - Math.min(60, Math.max(0, k.value * 50))}`,
                        )
                        .join(" ")}
                    />
                  </svg>
                )}
              </section>
            )}
          </>
        )}
      </div>
      <footer className="inspector-footer">
        <span>{layer ? "Layer" : "Scene"} properties</span>
        <IconButton
          label="Duplicate selection"
          onClick={() => {
            s.select(item.id);
            s.duplicate();
          }}
        >
          <Copy size={14} />
        </IconButton>
      </footer>
    </aside>
  );
}
export function Num({
  label,
  value,
  onChange,
  min = -10000,
  max = 10000,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={Number.isInteger(value) ? value : +value.toFixed(3)}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = +e.target.value;
          if (Number.isFinite(n) && n >= min && n <= max) onChange(n);
        }}
      />
    </Field>
  );
}
export function Color({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="color-field">
        <input
          aria-label={label}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span>{value.toUpperCase()}</span>
        <span className="muted">100%</span>
      </div>
    </Field>
  );
}
