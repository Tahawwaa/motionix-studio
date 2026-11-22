import React, {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  cancelRender,
  continueRender,
  delayRender,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { Project, Scene, Layer } from "../project-schema/index";
import { durationOf } from "../project-schema/index";
import {
  cameraPosition,
  clamp,
  ease,
  keyframeValue,
  mix,
  seeded,
} from "./motion";
export type NovaCompositionProps = {
  project: Project;
  assetBaseUrl?: string;
  enable3D?: boolean;
};
const alpha = (c: string, a: number) => {
  const raw = c.slice(1);
  const rgb =
    raw.length <= 4
      ? raw
          .slice(0, 3)
          .split("")
          .map((x) => x + x)
          .join("")
      : raw.slice(0, 6);
  return `#${rgb}${Math.round(a * 255)
    .toString(16)
    .padStart(2, "0")}`;
};
const txt: CSSProperties = {
  fontFamily: "Inter, Vazirmatn, sans-serif",
  color: "#F8FAFC",
};
function Fonts({
  project,
  assetBaseUrl,
}: {
  project: Project;
  assetBaseUrl: string;
}) {
  const [handle] = useState(() => delayRender("Loading local typography"));
  useEffect(() => {
    const families = [
      new FontFace("Inter", `url(${staticFile("fonts/Inter.woff2")})`, {
        weight: "100 900",
      }),
      new FontFace("Vazirmatn", `url(${staticFile("fonts/Vazirmatn.woff2")})`, {
        weight: "100 900",
      }),
      ...project.assets
        .filter((a) => a.type === "font")
        .map(
          (a) => new FontFace("asset-" + a.id, `url(${assetBaseUrl + a.path})`),
        ),
    ];
    let alive = true;
    Promise.all(
      families.map(async (font) => {
        const loaded = await font.load();
        document.fonts.add(loaded);
      }),
    )
      .then(() => {
        if (alive) continueRender(handle);
      })
      .catch((error) => {
        if (alive)
          cancelRender(
            new Error(
              `A required local font could not be loaded: ${error instanceof Error ? error.message : String(error)}`,
            ),
          );
      });
    return () => {
      alive = false;
      continueRender(handle);
    };
  }, [handle, assetBaseUrl]);
  return null;
}
function CameraRig({ scene, frame }: { scene: Scene; frame: number }) {
  const camera = useThree((s) => s.camera);
  const pos = cameraPosition(
    scene.camera.path,
    frame,
    scene.duration,
    scene.camera.intensity,
  );
  camera.position.set(...pos);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  return null;
}
function Model({ src }: { src: string }) {
  const gltf = useGLTF(src, false, false);
  const cloned = useMemo(() => {
    const object = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const factor = 3 / Math.max(0.001, size.x, size.y, size.z);
    object.position.sub(center);
    const group = new THREE.Group();
    group.add(object);
    group.scale.setScalar(factor);
    return group;
  }, [gltf.scene]);
  return <primitive object={cloned} />;
}
function TexturedScreen({ src }: { src: string }) {
  const texture = useTexture(src);
  return (
    <mesh position={[0, 0.05, 0.13]}>
      <planeGeometry args={[3.8, 2.15]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
function Geometry({
  scene,
  frame,
  screen,
  model,
}: {
  scene: Scene;
  frame: number;
  screen?: string;
  model?: string;
}) {
  const t = frame / 30;
  const a = scene.accent;
  const rotation: [number, number, number] = [
    Math.sin(t * 0.3) * 0.12,
    Math.sin(t * 0.25) * 0.35,
    t * 0.03,
  ];
  return (
    <>
      <CameraRig scene={scene} frame={frame} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 5, 5]} intensity={3} color="#ffffff" />
      <pointLight position={[-3, 1, 2]} color={a} intensity={35} />
      <pointLight position={[3, -2, 0]} color="#5B21B6" intensity={25} />
      <group
        rotation={rotation}
        position={[0, Math.sin(t) * 0.08, 0]}
        scale={0.82}
      >
        {model ? (
          <Model src={model} />
        ) : scene.type === "mobile" ? (
          <>
            <mesh>
              <boxGeometry args={[1.85, 3.65, 0.16]} />
              <meshPhysicalMaterial
                color="#151723"
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
            <mesh position={[0, 0, 0.1]}>
              <planeGeometry args={[1.65, 3.4]} />
              <meshStandardMaterial
                color={a}
                emissive={a}
                emissiveIntensity={0.15}
              />
            </mesh>
            {screen && <TexturedScreen src={screen} />}
          </>
        ) : scene.type === "product" ? (
          <>
            <mesh>
              <capsuleGeometry args={[0.85, 1.5, 12, 32]} />
              <meshPhysicalMaterial
                color="#d4d7e0"
                metalness={0.82}
                roughness={0.19}
                clearcoat={1}
              />
            </mesh>
            <mesh position={[0, 0.45, 0.77]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.46, 0.46, 0.09, 48]} />
              <meshPhysicalMaterial
                color="#111319"
                metalness={0.9}
                roughness={0.12}
              />
            </mesh>
            <mesh position={[0, 0.45, 0.84]}>
              <torusGeometry args={[0.4, 0.025, 12, 48]} />
              <meshStandardMaterial
                color={a}
                emissive={a}
                emissiveIntensity={0.35}
                metalness={0.8}
                roughness={0.15}
              />
            </mesh>
            <mesh position={[0, -0.75, 0.82]}>
              <sphereGeometry args={[0.075, 16, 16]} />
              <meshStandardMaterial
                color={a}
                emissive={a}
                emissiveIntensity={0.8}
              />
            </mesh>
            <mesh position={[0, -2, 0]}>
              <cylinderGeometry args={[1.6, 1.8, 0.2, 64]} />
              <meshStandardMaterial
                color="#14141e"
                metalness={0.8}
                roughness={0.24}
              />
            </mesh>
          </>
        ) : scene.type === "tech" ? (
          <>
            {Array.from({ length: 13 }, (_, i) => (
              <mesh
                key={i}
                position={[0, 0, -i * 0.75]}
                rotation={[0, 0, i * 0.09 + Math.sin(t * 0.3) * 0.1]}
              >
                <torusGeometry args={[2.3, 0.022, 8, 4]} />
                <meshBasicMaterial
                  color={i % 3 === 0 ? "#b7c9ff" : a}
                  transparent
                  opacity={1 - i * 0.045}
                />
              </mesh>
            ))}
            <mesh position={[0, 0, -9]} rotation={[t * 0.2, t * 0.1, 0]}>
              <octahedronGeometry args={[1.3, 0]} />
              <meshPhysicalMaterial
                color={a}
                emissive={a}
                emissiveIntensity={0.25}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
          </>
        ) : scene.type === "website" ? (
          <>
            <mesh rotation={[0, 0, -0.4]}>
              <torusGeometry args={[2.1, 0.045, 12, 90]} />
              <meshStandardMaterial color={a} metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh rotation={[0.7, 0.5, 0.4]}>
              <torusGeometry args={[2.6, 0.025, 8, 70]} />
              <meshStandardMaterial
                color="#6879a8"
                metalness={0.9}
                roughness={0.3}
              />
            </mesh>
          </>
        ) : (
          <>
            <mesh rotation={[0.4, 0.7, 0]}>
              <icosahedronGeometry args={[1.65, 0]} />
              <meshPhysicalMaterial
                color={a}
                metalness={0.82}
                roughness={0.15}
                clearcoat={1}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2 + 0.2, 0, t * 0.12]}>
              <torusGeometry args={[2.25, 0.035, 12, 80]} />
              <meshStandardMaterial
                color="#e4efff"
                metalness={0.9}
                roughness={0.18}
              />
            </mesh>
            <mesh position={[0, -2.1, 0]}>
              <cylinderGeometry args={[1.8, 2, 0.23, 64]} />
              <meshStandardMaterial
                color="#14141e"
                metalness={0.8}
                roughness={0.24}
              />
            </mesh>
          </>
        )}
      </group>
    </>
  );
}
class GLBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function Dimension({
  scene,
  frame,
  project,
  assetBaseUrl,
}: {
  scene: Scene;
  frame: number;
  project: Project;
  assetBaseUrl: string;
}) {
  const image = project.assets.find(
    (a) =>
      a.id ===
      scene.layers.find((l) => l.type === "image" && l.assetId)?.assetId,
  );
  const model = project.assets.find(
    (a) =>
      a.id ===
      scene.layers.find((l) => l.type === "model" && l.assetId)?.assetId,
  );
  const fallback = (
    <div
      style={{
        position: "absolute",
        inset: "18%",
        border: `2px solid ${scene.accent}`,
        transform: `perspective(1200px) rotateY(${frame * 0.1}deg) rotateX(30deg)`,
        borderRadius: 80,
        boxShadow: `0 0 160px ${alpha(scene.accent, 0.25)}`,
      }}
    />
  );
  return (
    <GLBoundary fallback={fallback}>
      <ThreeCanvas
        width={1080}
        height={1080}
        style={{ width: 1080, height: 1080 }}
        dpr={1}
        gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
        orthographic={scene.camera.projection === "orthographic"}
        camera={{
          fov: scene.camera.fov,
          position: [0, 0, 6.5],
          zoom: scene.camera.projection === "orthographic" ? 150 : 1,
        }}
      >
        <Suspense fallback={null}>
          <Geometry
            scene={scene}
            frame={frame}
            screen={image ? assetBaseUrl + image.path : undefined}
            model={model ? assetBaseUrl + model.path : undefined}
          />
        </Suspense>
      </ThreeCanvas>
    </GLBoundary>
  );
}
function Chart({
  accent,
  frame,
  width = 550,
  height = 190,
}: {
  accent: string;
  frame: number;
  width?: number;
  height?: number;
}) {
  const points = Array.from(
    { length: 22 },
    (_, i) =>
      `${(i / 21) * width},${height - (0.2 + seeded(i + 4) * 0.18 + i / 30) * height}`,
  ).join(" ");
  const p = clamp(frame / 45);
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity=".24" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
        <clipPath id="chartClip">
          <rect width={width * p} height={height + 10} />
        </clipPath>
      </defs>
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1="0"
          x2={width}
          y1={(i * height) / 3}
          y2={(i * height) / 3}
          stroke="#ffffff10"
        />
      ))}
      <g clipPath="url(#chartClip)">
        <polygon
          points={`0,${height} ${points} ${width},${height}`}
          fill="url(#chartFill)"
        />
        <polyline
          points={points}
          fill="none"
          stroke={accent}
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
function Browser({
  scene,
  frame,
  screenshot,
}: {
  scene: Scene;
  frame: number;
  screenshot?: string;
}) {
  const a = scene.accent;
  const e = ease(frame / 35, "ease-out");
  const tilt = Math.sin(frame / 110) * 3;
  return (
    <div
      style={{
        position: "absolute",
        left: 65,
        top: 750,
        width: 950,
        height: 660,
        transform: `perspective(1600px) rotateX(${10 - 6 * e}deg) rotateY(${-13 + tilt}deg) rotateZ(-5deg) translateY(${(1 - e) * 100}px)`,
        opacity: e,
        background: "#13131c",
        border: "2px solid #ffffff28",
        borderRadius: 22,
        boxShadow: `0 80px 160px #000a,0 0 180px ${alpha(a, 0.14)}`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 53,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 24px",
          borderBottom: "1px solid #ffffff16",
          background: "#1a1b24",
        }}
      >
        {["#ff6f76", "#f4c66b", "#65d29a"].map((c) => (
          <i
            key={c}
            style={{
              width: 10,
              height: 10,
              background: c,
              borderRadius: "50%",
            }}
          />
        ))}
        <span
          style={{
            margin: "auto",
            fontSize: 17,
            color: "#8a91a7",
            letterSpacing: 1,
          }}
        >
          nova.design
        </span>
        <span style={{ width: 30 }} />
      </div>
      <div
        style={{
          padding: "30px 45px",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid #ffffff10",
        }}
      >
        <b style={{ fontSize: 28, letterSpacing: -1 }}>
          nova<span style={{ color: a }}>®</span>
        </b>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 32,
            fontSize: 13,
            color: "#9da2b7",
          }}
        >
          <span>Work</span>
          <span>Approach</span>
          <span>Studio</span>
          <span style={{ color: "#fff" }}>Let’s talk ↗</span>
        </div>
      </div>
      <div
        style={{ display: "flex", padding: "64px 45px", position: "relative" }}
      >
        <div style={{ width: "62%", zIndex: 1 }}>
          <div
            style={{
              color: a,
              fontSize: 12,
              letterSpacing: 3,
              marginBottom: 24,
            }}
          >
            INDEPENDENT DIGITAL STUDIO
          </div>
          <div
            style={{
              fontSize: 69,
              lineHeight: 1.02,
              fontWeight: 600,
              letterSpacing: -3,
            }}
          >
            A little bold.
            <br />A lot of
            <br />
            <span style={{ color: a }}>possibility.</span>
          </div>
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.7,
              color: "#9296aa",
              maxWidth: 290,
              marginTop: 25,
            }}
          >
            We turn ambitious ideas into digital experiences people remember.
          </div>
          <div
            style={{
              display: "inline-flex",
              background: a,
              color: "#fff",
              padding: "13px 18px",
              fontSize: 12,
              marginTop: 24,
              borderRadius: 5,
            }}
          >
            Explore our work ↗
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            right: 20,
            top: 60,
            width: 330,
            height: 340,
            perspective: 600,
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 220,
                height: 220,
                borderRadius: 40,
                border: `1px solid ${alpha(a, 0.7)}`,
                background: `linear-gradient(135deg,${alpha(a, 0.2)},${alpha(a, 0.02)})`,
                transform: `translate(${i * 16}px,${i * 18}px) rotateX(50deg) rotateZ(${-25 + Math.sin(frame / 70) * 5}deg)`,
                boxShadow: `0 8px 35px ${alpha(a, 0.12)}`,
              }}
            />
          ))}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 22,
          display: "flex",
          gap: 35,
          justifyContent: "center",
          color: "#686d82",
          fontSize: 15,
          borderTop: "1px solid #ffffff10",
        }}
      >
        STRATEGY <span>·</span> DESIGN <span>·</span> DEVELOPMENT <span>·</span>{" "}
        MOTION
      </div>
      {screenshot && (
        <Img
          crossOrigin="anonymous"
          src={screenshot}
          style={{
            position: "absolute",
            left: 0,
            top: 53,
            width: "100%",
            height: "calc(100% - 53px)",
            objectFit: "cover",
          }}
        />
      )}
    </div>
  );
}
function FloatingCard({
  x,
  y,
  frame,
  delay = 0,
  children,
  accent,
  rotate = 0,
  width = 280,
}: {
  x: number;
  y: number;
  frame: number;
  delay?: number;
  children: ReactNode;
  accent: string;
  rotate?: number;
  width?: number;
}) {
  const e = ease((frame - delay) / 35, "ease-out");
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + Math.sin((frame + delay) / 45) * 12 + (1 - e) * 50,
        width,
        padding: 28,
        background: "linear-gradient(145deg,#202436e8,#111421ee)",
        border: "1px solid #ffffff23",
        borderRadius: 18,
        backdropFilter: "blur(20px)",
        boxShadow: `0 25px 70px #0009,0 0 30px ${alpha(accent, 0.03)}`,
        transform: `rotate(${rotate}deg) scale(${0.9 + 0.1 * e})`,
        opacity: e,
      }}
    >
      {children}
    </div>
  );
}
function Analytics({ scene, frame }: { scene: Scene; frame: number }) {
  const a = scene.accent;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 100,
          top: 740,
          width: 880,
          height: 720,
          padding: 42,
          background: "linear-gradient(140deg,#1d2130,#0c1019)",
          border: "1px solid #ffffff28",
          borderRadius: 26,
          transform: `perspective(2000px) rotateY(${-6 + Math.sin(frame / 90) * 4}deg) rotateX(8deg)`,
          boxShadow: "0 70px 120px #0009",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <b style={{ fontSize: 25 }}>Overview</b>
          <span style={{ fontSize: 16, color: "#8690a6" }}>Last 30 days ▾</span>
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 35 }}>
          {[
            ["Revenue", "$48,290", "+24.8%"],
            ["Active users", "12,840", "+18.6%"],
            ["Conversion", "8.24%", "+4.2%"],
          ].map(([n, v, c]) => (
            <div
              key={n}
              style={{
                flex: 1,
                padding: 24,
                background: "#ffffff05",
                border: "1px solid #ffffff0a",
                borderRadius: 12,
              }}
            >
              <div style={{ fontSize: 15, color: "#969caf" }}>{n}</div>
              <div style={{ fontSize: 33, fontWeight: 500, marginTop: 18 }}>
                {v}
              </div>
              <div style={{ fontSize: 14, color: a, marginTop: 10 }}>{c}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 40, height: 260, padding: 10 }}>
          <Chart accent={a} frame={frame - 10} />
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 20 }}>
          {[44, 70, 55, 83, 64, 91, 74, 99, 88, 79, 95, 85].map((n, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: Math.max(3, n * clamp((frame - i * 2) / 35)),
                background: i === 9 ? a : "#ffffff15",
                borderRadius: 4,
                alignSelf: "flex-end",
              }}
            />
          ))}
        </div>
      </div>
      <FloatingCard
        x={690}
        y={1320}
        width={300}
        frame={frame}
        delay={18}
        accent={a}
        rotate={6}
      >
        <div style={{ fontSize: 15, color: "#a0a7ba" }}>
          Your growth, visualized
        </div>
        <div style={{ fontSize: 43, marginTop: 13, color: a }}>↑ 128.4%</div>
      </FloatingCard>
    </>
  );
}
function GlassPanels({ scene, frame }: { scene: Scene; frame: number }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 130 + i * 95,
            top: 800 + i * 75,
            width: 650,
            height: 450,
            border: "1px solid #ffffff38",
            background: `linear-gradient(130deg,${alpha(scene.accent, 0.12)},#ffffff03)`,
            borderRadius: 30,
            backdropFilter: "blur(15px)",
            transform: `perspective(1400px) rotateY(${-24 + Math.sin(frame / 80) * 5}deg) rotateZ(-12deg) translateY(${Math.sin(frame / 40 + i) * 15}px)`,
            boxShadow: "0 50px 100px #0006",
            padding: 45,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 18,
              background: alpha(scene.accent, 0.3),
              border: "1px solid #ffffff20",
            }}
          />
          <div
            style={{
              height: 17,
              width: "55%",
              background: "#ffffff60",
              marginTop: 35,
              borderRadius: 10,
            }}
          />
          <div
            style={{
              height: 11,
              width: "80%",
              background: "#ffffff20",
              marginTop: 22,
              borderRadius: 10,
            }}
          />
          <div
            style={{
              height: 11,
              width: "66%",
              background: "#ffffff14",
              marginTop: 14,
              borderRadius: 10,
            }}
          />
          <div style={{ marginTop: 40, display: "flex", gap: 15 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div
                key={n}
                style={{
                  height: (30 + seeded(n + i) * 80) * clamp(frame / 35),
                  background: alpha(scene.accent, n === 4 ? 0.9 : 0.3),
                  width: 45,
                  borderRadius: 5,
                  alignSelf: "flex-end",
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
function Phone({ scene, frame }: { scene: Scene; frame: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 300,
        top: 670,
        width: 480,
        height: 890,
        borderRadius: 65,
        border: "9px solid #363943",
        background: "#10131d",
        boxShadow: `0 80px 140px #000a,0 0 120px ${alpha(scene.accent, 0.16)}`,
        transform: `perspective(1700px) rotateY(${-15 + Math.sin(frame / 80) * 12}deg) rotateZ(-7deg)`,
        padding: 40,
      }}
    >
      <div
        style={{
          height: 26,
          width: 160,
          background: "#020206",
          borderRadius: 30,
          margin: "-15px auto 60px",
        }}
      />
      <div style={{ fontSize: 19, color: "#9da4b7" }}>Good morning, Alex</div>
      <div
        style={{
          fontSize: 48,
          fontWeight: 600,
          marginTop: 18,
          lineHeight: 1.06,
        }}
      >
        Make space
        <br />
        for better.
      </div>
      <div
        style={{
          marginTop: 40,
          padding: 30,
          background: alpha(scene.accent, 0.2),
          borderRadius: 22,
        }}
      >
        <div style={{ fontSize: 16, color: scene.accent }}>
          YOUR DAILY FOCUS
        </div>
        <div style={{ fontSize: 30, marginTop: 22 }}>
          A little progress,
          <br />
          every day.
        </div>
        <div
          style={{
            width: "100%",
            height: 9,
            background: "#ffffff15",
            borderRadius: 10,
            marginTop: 40,
          }}
        >
          <div
            style={{
              height: 9,
              width: `${clamp(frame / 60) * 75}%`,
              background: scene.accent,
              borderRadius: 10,
            }}
          />
        </div>
      </div>
      {["Plan with intention", "Create something new", "Take a moment"].map(
        (v, i) => (
          <div
            key={v}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 15,
              marginTop: 35,
              fontSize: 22,
              color: i ? "#9299ae" : "#fff",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                border: `2px solid ${i ? "#ffffff20" : scene.accent}`,
                borderRadius: 10,
                background: i ? "transparent" : scene.accent,
              }}
            />
            {v}
          </div>
        ),
      )}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 160,
          width: 140,
          height: 5,
          borderRadius: 5,
          background: "#fff6",
        }}
      />
    </div>
  );
}
function Education({ scene, frame }: { scene: Scene; frame: number }) {
  return (
    <div style={{ position: "absolute", left: 100, right: 100, top: 850 }}>
      {[
        ["01", "See the possibility.", "Start with one focused idea."],
        ["02", "Build with intention.", "Give every detail a purpose."],
        ["03", "Make your next move.", "Progress begins with a first step."],
      ].map(([n, title, sub], i) => (
        <div
          key={n}
          style={{
            display: "flex",
            gap: 30,
            marginBottom: 40,
            opacity: ease((frame - i * 14) / 30),
            transform: `translateY(${30 * (1 - ease((frame - i * 14) / 30))}px)`,
          }}
        >
          <span
            style={{
              width: 90,
              height: 90,
              borderRadius: 24,
              background: alpha(scene.accent, 0.12),
              border: `1px solid ${alpha(scene.accent, 0.3)}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              color: scene.accent,
            }}
          >
            {n}
          </span>
          <div style={{ paddingTop: 7 }}>
            <div style={{ fontSize: 34, fontWeight: 600 }}>{title}</div>
            <div style={{ fontSize: 22, marginTop: 12, color: "#9299af" }}>
              {sub}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
function Comparison({ scene, frame }: { scene: Scene; frame: number }) {
  return (
    <>
      <Browser scene={scene} frame={frame} />
      <div
        style={{
          position: "absolute",
          left: 60,
          top: 760,
          width: Math.max(0, 440 - 220 * clamp(frame / 120)),
          height: 640,
          background: "#d7d9db",
          borderRadius: "20px 0 0 20px",
          transform: "rotate(-5deg)",
          padding: 30,
          color: "#555",
          overflow: "hidden",
        }}
      >
        <b style={{ fontSize: 28 }}>Your website</b>
        <div style={{ fontSize: 18, marginTop: 35, lineHeight: 2 }}>
          Home | About | Contact
        </div>
        <div style={{ fontFamily: "Georgia", fontSize: 50, marginTop: 60 }}>
          Welcome to
          <br />
          our business
        </div>
        <div
          style={{ width: 160, height: 40, background: "#999", marginTop: 30 }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: 1470,
          left: 150,
          right: 150,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 21,
          letterSpacing: 4,
          color: "#8b91a8",
        }}
      >
        <span>BEFORE</span>
        <span style={{ color: scene.accent }}>AFTER</span>
      </div>
    </>
  );
}
function BrandReveal({ scene, frame }: { scene: Scene; frame: number }) {
  const e = spring({ frame, fps: 30, config: { damping: 15, stiffness: 65 } });
  return (
    <div
      style={{
        position: "absolute",
        left: 230,
        top: 750,
        width: 620,
        height: 620,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${e}) rotate(${-25 * (1 - e)}deg)`,
      }}
    >
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 300 + i * 80,
            height: 300 + i * 80,
            border: `1px solid ${alpha(scene.accent, 0.35 - i * 0.07)}`,
            borderRadius: "50%",
            transform: `scale(${1 + Math.sin(frame / 60 + i) * 0.03})`,
          }}
        />
      ))}
      <div
        style={{
          fontSize: 250,
          letterSpacing: -25,
          fontWeight: 600,
          color: "#fff",
          textShadow: `0 0 100px ${alpha(scene.accent, 0.5)}`,
        }}
      >
        n<span style={{ color: scene.accent }}>✳</span>
      </div>
    </div>
  );
}
function SceneArtwork({
  scene,
  project,
  assetBaseUrl,
  enable3D,
}: {
  scene: Scene;
  project: Project;
  assetBaseUrl: string;
  enable3D: boolean;
}) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const portrait = height >= width;
  const isFa = scene.type === "business" || /[\u0600-\u06FF]/.test(scene.title);
  const normalizedHeight = (1080 * height) / width;
  const ratio = portrait ? width / 1080 : height / 1920;
  const screenshotAsset = project.assets.find(
    (a) => a.id === scene.layers.find((l) => l.type === "image")?.assetId,
  );
  const screenshot = screenshotAsset
    ? assetBaseUrl + screenshotAsset.path
    : undefined;
  const e = ease(frame / 30, "ease-out");
  const out = clamp(
    (scene.duration - frame) / Math.max(1, scene.transitionDuration),
  );
  const trans =
    scene.transition === "none"
      ? 1
      : ease(frame / Math.max(1, scene.transitionDuration), "ease-out");
  const scale = scene.transition === "zoom" ? mix(1.08, 1, trans) : 1;
  const x = scene.transition === "slide" ? mix(140, 0, trans) : 0;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: scene.background,
        overflow: "hidden",
        opacity: Math.min(trans, out),
        clipPath:
          scene.transition === "wipe"
            ? `inset(0 ${(1 - trans) * 100}% 0 0)`
            : undefined,
        filter:
          scene.transition === "blur"
            ? `blur(${(1 - trans) * 18}px)`
            : scene.transition === "flash"
              ? `brightness(${1 + (1 - trans) * 5})`
              : "none",
        transform: `translateX(${x + (scene.transition === "glitch" && trans < 1 ? Math.sin(frame * 19) * 30 * (1 - trans) : 0)}px) scale(${scale}) rotateY(${scene.transition === "rotate" ? (1 - trans) * 70 : 0}deg)`,
        ...txt,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 1080,
          height: 1920,
          left: portrait ? 0 : (width - 1080 * ratio) / 2,
          transform: `scale(${ratio})`,
          transformOrigin: "top left",
        }}
      >
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at 56% 52%, ${alpha(scene.accent, 0.14)}, transparent 58%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.15,
            backgroundImage:
              "linear-gradient(#737a9820 1px, transparent 1px),linear-gradient(90deg,#737a9820 1px,transparent 1px)",
            backgroundSize: "90px 90px",
            maskImage: "linear-gradient(transparent,#000,transparent)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 100,
            left: 85,
            right: 85,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            letterSpacing: 3,
            color: "#a0a6ba",
          }}
        >
          <b style={{ letterSpacing: -1, color: "#fff", fontSize: 31 }}>
            nova<span style={{ color: scene.accent }}>®</span>
          </b>
          <span style={{ fontSize: 15, paddingTop: 8 }}>
            INDEPENDENT BY DESIGN
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            left: 90,
            right: 90,
            top: isFa ? 210 : 250,
            direction: isFa ? "rtl" : "ltr",
            textAlign: isFa ? "right" : "left",
            fontFamily: isFa ? "Vazirmatn, sans-serif" : project.brand.font,
          }}
        >
          <div
            style={{
              fontSize: isFa ? 25 : 17,
              letterSpacing: isFa ? 0 : 4,
              color: scene.accent,
              marginBottom: 30,
              opacity: e,
            }}
          >
            {scene.eyebrow}
          </div>
          <div
            style={{
              fontSize: scene.type === "typography" ? 139 : isFa ? 82 : 106,
              fontWeight: 600,
              lineHeight: isFa ? 1.35 : 1.03,
              letterSpacing: isFa ? 0 : -5,
              textShadow: scene.effects.includes("chromatic")
                ? "3px 0 #ff2d7050,-3px 0 #2df2ff50"
                : scene.effects.includes("bloom")
                  ? `0 0 45px ${alpha(scene.accent, 0.4)}`
                  : undefined,
              whiteSpace: "pre-wrap",
              transform: `translateY(${(1 - e) * 40}px)`,
              opacity: e,
            }}
          >
            {scene.title}
          </div>
          <div
            style={{
              fontSize: isFa ? 29 : 25,
              lineHeight: 1.7,
              color: "#9199b2",
              marginTop: 30,
              opacity: ease((frame - 8) / 30),
              maxWidth: 790,
            }}
          >
            {scene.subtitle}
          </div>
        </div>
        {scene.type === "website" || scene.type === "business" ? (
          <>
            <Browser scene={scene} frame={frame} screenshot={screenshot} />
            <FloatingCard
              x={645}
              y={697}
              frame={frame}
              delay={15}
              accent={scene.accent}
              rotate={7}
              width={310}
            >
              <div
                style={{
                  fontSize: 16,
                  color: "#8d96af",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ color: "#9edac1" }}>●</span> All systems
                beautiful
              </div>
              <div style={{ fontSize: 32, fontWeight: 500, marginTop: 17 }}>
                Designed to perform.
              </div>
            </FloatingCard>
            <FloatingCard
              x={50}
              y={1310}
              frame={frame}
              delay={22}
              accent={scene.accent}
              rotate={-8}
              width={290}
            >
              <div style={{ fontSize: 17, color: "#99a2b7" }}>
                A better experience
              </div>
              <div style={{ fontSize: 43, fontWeight: 500, marginTop: 12 }}>
                98<span style={{ fontSize: 23, color: "#9098b0" }}>/100</span>
                <span
                  style={{ fontSize: 21, color: "#6bdeb1", marginLeft: 25 }}
                >
                  ↑ 34%
                </span>
              </div>
              <div style={{ marginTop: 18, height: 45 }}>
                <Chart
                  accent={scene.accent}
                  frame={frame - 20}
                  width={220}
                  height={45}
                />
              </div>
            </FloatingCard>
          </>
        ) : scene.type === "saas" ? (
          <Analytics scene={scene} frame={frame} />
        ) : scene.type === "glass" ? (
          <GlassPanels scene={scene} frame={frame} />
        ) : scene.type === "mobile" ? (
          <Phone scene={scene} frame={frame} />
        ) : scene.type === "education" ? (
          <Education scene={scene} frame={frame} />
        ) : scene.type === "before-after" ? (
          <Comparison scene={scene} frame={frame} />
        ) : scene.type === "brand" ? (
          <BrandReveal scene={scene} frame={frame} />
        ) : scene.type === "typography" ? (
          <div style={{ position: "absolute", top: 1030, left: 85, right: 85 }}>
            {["CREATE.", "CONNECT.", "INSPIRE."].map((word, i) => (
              <div
                key={word}
                style={{
                  fontSize: 125,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: -5,
                  color: i === 1 ? scene.accent : "#ffffff15",
                  transform: `translateX(${(1 - ease((frame - i * 10) / 35)) * 200}px)`,
                  opacity: ease((frame - i * 10) / 35),
                }}
              >
                {word}
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 650,
              width: 1080,
              height: 1080,
            }}
          >
            {enable3D ? (
              <Dimension
                scene={scene}
                frame={frame}
                project={project}
                assetBaseUrl={assetBaseUrl}
              />
            ) : (
              <BrandReveal scene={scene} frame={frame} />
            )}
          </div>
        )}
        {scene.effects.includes("particles") &&
          Array.from({ length: 24 }, (_, i) => (
            <i
              key={i}
              style={{
                position: "absolute",
                left: seeded(i) * 1080,
                top:
                  (seeded(i + 40) * 1920 -
                    ((frame * (0.2 + seeded(i))) % 1920) +
                    1920) %
                  1920,
                width: 3 + seeded(i + 99) * 5,
                height: 3 + seeded(i + 99) * 5,
                background: scene.accent,
                borderRadius: "50%",
                opacity: 0.3,
              }}
            />
          ))}
        <div
          style={{
            position: "absolute",
            left: 90,
            right: 90,
            top: 1690,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #ffffff18",
            paddingTop: 30,
          }}
        >
          <span style={{ fontSize: 17, color: "#6f7893", letterSpacing: 2 }}>
            {isFa
              ? "ایده‌های بزرگ، تجربه‌های ماندگار"
              : "MAKE A LASTING IMPRESSION"}
          </span>
          <span style={{ color: scene.accent, fontSize: 26 }}>✳</span>
        </div>
        {scene.effects.includes("scanlines") && (
          <AbsoluteFill
            style={{
              pointerEvents: "none",
              backgroundImage:
                "repeating-linear-gradient(0deg,transparent,transparent 5px,#ffffff05 6px)",
              opacity: 0.5,
            }}
          />
        )}
        {scene.effects.includes("vignette") && (
          <AbsoluteFill
            style={{
              pointerEvents: "none",
              background: "radial-gradient(ellipse,transparent 40%,#0007 100%)",
            }}
          />
        )}
        {scene.effects.includes("light-sweep") && (
          <AbsoluteFill
            style={{
              pointerEvents: "none",
              background: `linear-gradient(${120 + frame / 10}deg,transparent 35%,${alpha(scene.accent, 0.13)} 50%,transparent 65%)`,
            }}
          />
        )}
        {scene.effects.includes("grain") && (
          <AbsoluteFill
            style={{
              pointerEvents: "none",
              opacity: 0.035,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch' seed='7'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' opacity='.7' filter='url(%23n)'/%3E%3C/svg%3E")`,
            }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
}
function UserLayer({
  layer,
  scene,
  project,
  assetBaseUrl,
}: {
  layer: Layer;
  scene: Scene;
  project: Project;
  assetBaseUrl: string;
}) {
  const f = useCurrentFrame();
  const { width } = useVideoConfig();
  const asset = project.assets.find((a) => a.id === layer.assetId);
  const track = project.tracks.find((t) => t.id === layer.trackId);
  const solo = project.tracks.some((t) => t.solo && t.type === "audio");
  if (!layer.visible || track?.hidden) return null;
  const src = asset ? assetBaseUrl + asset.path : "";
  const anim = layer.animation;
  const rtl =
    layer.direction === "rtl" ||
    (layer.direction === "auto" && /[\u0600-\u06FF]/.test(layer.text));
  const reveal = Math.min(
    1,
    Math.floor(f / 2) / Math.max(1, Array.from(layer.text).length),
  );
  const p = ease(f / 24, "ease-out");
  const opacity =
    keyframeValue(layer.keyframes, "opacity", f, layer.opacity) *
    (anim === "none" || anim === "float" || anim === "orbit" ? 1 : p);
  let dx = 0,
    dy = 0,
    sc = 1,
    rot = 0;
  if (anim === "slide" || anim === "parallax") dy = (1 - p) * 80;
  if (anim === "scale" || anim === "spring" || anim === "elastic")
    sc =
      anim === "scale"
        ? 0.7 + 0.3 * p
        : spring({
            frame: f,
            fps: project.fps,
            config: { damping: anim === "elastic" ? 8 : 16, stiffness: 90 },
          });
  if (anim === "float") dy = Math.sin(f / 30) * 18;
  if (anim === "orbit") {
    dx = Math.cos(f / 50) * 35;
    dy = Math.sin(f / 50) * 25;
  }
  if (anim === "perspective") rot = (1 - p) * 30;
  const x = keyframeValue(layer.keyframes, "x", f, layer.x),
    y = keyframeValue(layer.keyframes, "y", f, layer.y);
  const s: CSSProperties = {
    position: "absolute",
    left: `${x}%`,
    top: `${y}%`,
    width: `${layer.width}%`,
    height: layer.type === "text" ? "auto" : `${layer.height}%`,
    transform: `translate(-50%,-50%) translate(${dx}px,${dy}px) rotate(${keyframeValue(layer.keyframes, "rotation", f, layer.rotation) + rot}deg) scale(${keyframeValue(layer.keyframes, "scale", f, layer.scale) * sc})`,
    opacity,
    zIndex: layer.zIndex,
    filter: `blur(${Math.max(0, keyframeValue(layer.keyframes, "blur", f, 0))}px)`,
    overflow: "hidden",
  };
  if (layer.type === "audio") {
    if (!src || track?.muted || (solo && !track?.solo)) return null;
    return (
      <Audio
        src={src}
        startFrom={layer.trimStart}
        volume={(frame) =>
          Math.max(
            0,
            keyframeValue(layer.keyframes, "volume", frame, layer.volume),
          ) * Math.min(1, frame / 8, (layer.duration - frame) / 12)
        }
      />
    );
  }
  if (layer.type === "text")
    return (
      <div
        style={{
          ...s,
          color: layer.color,
          fontSize:
            (keyframeValue(layer.keyframes, "fontSize", f, layer.fontSize) *
              width) /
            1080,
          fontFamily: layer.fontFamily.startsWith("asset:")
            ? "asset-" + layer.fontFamily.slice(6)
            : layer.fontFamily,
          fontWeight: layer.fontWeight,
          textAlign: layer.align,
          lineHeight: 1.35,
          whiteSpace: "pre-wrap",
          direction: layer.direction === "auto" ? undefined : layer.direction,
          clipPath:
            anim === "typewriter" && rtl
              ? `inset(0 0 0 ${(1 - reveal) * 100}%)`
              : anim === "mask"
                ? `inset(0 ${rtl ? 0 : (1 - p) * 100}% 0 ${rtl ? (1 - p) * 100 : 0}%)`
                : undefined,
        }}
        dir={layer.direction}
      >
        {anim === "typewriter" && !rtl
          ? Array.from(layer.text)
              .slice(0, Math.floor(f / 2))
              .join("")
          : anim === "stagger"
            ? layer.text.split(/(\s+)/).map((word, i) =>
                /^\s+$/.test(word) ? (
                  word
                ) : (
                  <span
                    key={i}
                    style={{
                      display: "inline-block",
                      opacity: ease((f - i * 3) / 18),
                      transform: `translateY(${(1 - ease((f - i * 3) / 18)) * 20}px)`,
                    }}
                  >
                    {word}
                  </span>
                ),
              )
            : layer.text}
      </div>
    );
  if (layer.type === "image" && src)
    return (
      <div style={s}>
        <Img
          crossOrigin="anonymous"
          src={src}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
    );
  if (layer.type === "video" && src)
    return (
      <div style={s}>
        <OffthreadVideo
          src={src}
          startFrom={layer.trimStart}
          muted={track?.muted || (solo && !track?.solo)}
          volume={layer.volume}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  if (layer.type === "model" && src)
    return (
      <div style={s}>
        <GLBoundary
          fallback={
            <div style={{ color: "#94a3b8" }}>3D preview unavailable</div>
          }
        >
          <ThreeCanvas
            width={Math.max(1, Math.round((project.width * layer.width) / 100))}
            height={Math.max(
              1,
              Math.round((project.height * layer.height) / 100),
            )}
            dpr={1}
            camera={{
              position: [
                keyframeValue(layer.keyframes, "cameraX", f, 0),
                keyframeValue(layer.keyframes, "cameraY", f, 0),
                keyframeValue(layer.keyframes, "cameraZ", f, 6.5),
              ],
              fov: 42,
            }}
            gl={{ antialias: false, alpha: true }}
          >
            <ambientLight intensity={1} />
            <directionalLight position={[3, 5, 4]} intensity={3} />
            <Suspense fallback={null}>
              <group rotation={[0, f * 0.005, 0]}>
                <Model src={src} />
              </group>
            </Suspense>
          </ThreeCanvas>
        </GLBoundary>
      </div>
    );
  if (layer.type === "shape")
    return (
      <div
        style={{
          ...s,
          background: layer.color,
          borderRadius: layer.name.toLowerCase().includes("circle")
            ? "50%"
            : 20,
        }}
      />
    );
  return null;
}
export const NovaComposition: React.FC<NovaCompositionProps> = ({
  project,
  assetBaseUrl = "",
  enable3D = true,
}) => (
  <AbsoluteFill style={{ backgroundColor: project.brand.background, ...txt }}>
    <Fonts
      key={project.assets
        .filter((a) => a.type === "font")
        .map((a) => a.id + a.path)
        .join(":")}
      project={project}
      assetBaseUrl={assetBaseUrl}
    />
    {project.scenes.map((scene) => (
      <Sequence
        key={scene.id}
        from={scene.startFrame}
        durationInFrames={scene.duration}
        name={scene.name}
      >
        {!project.tracks.find((t) => t.type === "scene")?.hidden && (
          <SceneArtwork
            scene={scene}
            project={project}
            assetBaseUrl={assetBaseUrl}
            enable3D={enable3D}
          />
        )}
        {scene.layers
          .slice()
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((layer) => (
            <Sequence
              key={layer.id}
              from={layer.startFrame}
              durationInFrames={layer.duration}
              name={layer.name}
            >
              <UserLayer
                layer={layer}
                scene={scene}
                project={project}
                assetBaseUrl={assetBaseUrl}
              />
            </Sequence>
          ))}
      </Sequence>
    ))}
  </AbsoluteFill>
);
export { durationOf };
