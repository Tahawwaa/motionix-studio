import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createProject } from "../packages/templates";
import {
  ProjectSchema,
  SceneSchema,
  LayerSchema,
  uid,
  type Asset,
  type Layer,
  type Project,
} from "../packages/project-schema";
const directory = path.resolve("examples/nova-intro");
const api = "http://127.0.0.1:8000",
  worker = "http://127.0.0.1:8001";
const headers: Record<string, string> = {
  Accept: "application/json",
  ...(process.env.NOVA_API_TOKEN
    ? { Authorization: `Bearer ${process.env.NOVA_API_TOKEN}` }
    : {}),
};
async function call(
  url: string,
  body?: unknown,
  method = body ? "POST" : "GET",
) {
  const r = await fetch(url, {
    method,
    headers: {
      ...headers,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(json));
  return json;
}
async function upload(file: string, mime: string): Promise<Asset> {
  const contents = fs.readFileSync(file);
  const name = path.basename(file);
  const all: Asset[] = await call(api + "/api/assets");
  const match = all.find((a) => a.name === name && a.size === contents.length);
  if (match) return match;
  const fd = new FormData();
  fd.append("file", new Blob([contents], { type: mime }), name);
  const r = await fetch(api + "/api/assets", {
    method: "POST",
    headers,
    body: fd,
  });
  const result = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(result));
  return result.asset ?? result;
}
function score() {
  const rate = 48000,
    seconds = 30,
    n = rate * seconds,
    buffer = Buffer.alloc(44 + n * 4);
  buffer.write("RIFF");
  buffer.writeUInt32LE(36 + n * 4, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(2, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 4, 28);
  buffer.writeUInt16LE(4, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(n * 4, 40);
  const roots = [55, 43.6535, 65.4064, 48.9994];
  let seed = 382651;
  for (let i = 0; i < n; i++) {
    const t = i / rate,
      beat = t % 0.5,
      off = t % 0.25,
      root = roots[Math.floor(t / 4) % 4],
      fade = Math.min(1, t / 0.18, (seconds - t) / 1.2);
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    const noise = ((seed >>> 0) / 4294967296) * 2 - 1;
    const kick =
      Math.sin(2 * Math.PI * (40 * beat + 9 * (1 - Math.exp(-beat * 30)))) *
      Math.exp(-beat * 20) *
      0.22;
    const hat = noise * Math.exp(-off * 110) * 0.025;
    const chord =
      (Math.sin(2 * Math.PI * root * 4 * t) +
        0.5 * Math.sin(2 * Math.PI * root * 6 * t) +
        0.25 * Math.sin(2 * Math.PI * root * 8 * t)) *
      0.025;
    const bass =
      Math.sin(2 * Math.PI * root * t) *
      0.05 *
      (0.5 + 0.5 * Math.exp(-beat * 9));
    const note = [4, 6, 8, 12][Math.floor(t / 0.25) % 4];
    const arp =
      Math.sin(2 * Math.PI * root * note * t) * Math.exp(-off * 17) * 0.035;
    const sweep = [3, 9, 14, 20, 25, 28].reduce((sum, c) => {
      const dt = t - c;
      return (
        sum +
        (dt > -0.25 && dt < 0.4
          ? noise * 0.04 * Math.exp(-Math.abs(dt) * 12)
          : 0)
      );
    }, 0);
    const value = (kick + hat + chord + bass + arp + sweep) * fade;
    for (let ch = 0; ch < 2; ch++) {
      const stereo =
        value +
        Math.sin(2 * Math.PI * (root * 4 + (ch ? 0.18 : -0.18)) * t) *
          0.009 *
          fade;
      buffer.writeInt16LE(
        Math.round(Math.max(-0.95, Math.min(0.95, stereo)) * 32767),
        44 + i * 4 + ch * 2,
      );
    }
  }
  const file = path.join(directory, "nova-intro-original-score.wav");
  fs.writeFileSync(file, buffer);
  return file;
}
const shots = [
  {
    seconds: 3,
    name: "آغاز",
    eyebrow: "ساخته شده با خود نُوا",
    title: "این ویدیو،\nکار خودِ نُواست.",
    subtitle: "از یک ایده تا یک خروجی واقعی",
    image: "editor",
    width: 138,
    x: 50,
    y: 63,
    opacity: 0.32,
  },
  {
    seconds: 6,
    name: "ادیتور زنده",
    eyebrow: "یک میز کار برای ایده‌ها",
    title: "اینجا، ایده‌ات\nحرکت می‌گیره.",
    subtitle: "صحنه‌ها را ببین؛ زمان‌بندی را تنظیم کن.",
    image: "editor",
    width: 150,
    x: 50,
    y: 60,
    opacity: 1,
  },
  {
    seconds: 5,
    name: "قالب‌ها",
    eyebrow: "شروع سریع‌تر",
    title: "از صفر\nشروع نکن.",
    subtitle: "۱۲ قالب آماده؛ با متن و رنگ خودت.",
    image: "templates",
    width: 145,
    x: 42,
    y: 59,
    opacity: 1,
  },
  {
    seconds: 6,
    name: "فارسی و سه‌بعدی",
    eyebrow: "کنترل هر جزئیات",
    title: "فارسی بنویس.\nبا دقت حرکت بده.",
    subtitle: "متن قابل ویرایش، حرکت و دوربین.",
    image: "three-editor",
    width: 200,
    x: 20,
    y: 64,
    opacity: 0.65,
  },
  {
    seconds: 5,
    name: "اتصال ایجنت",
    eyebrow: "گردش‌کار با ایجنت",
    title: "تو ایده بده.\nایجنت اجرا می‌کنه.",
    subtitle: "کنترل پروژه با اتصال MCP",
    image: "director",
    width: 170,
    x: 28,
    y: 61,
    opacity: 1,
  },
  {
    seconds: 3,
    name: "رندر محلی",
    eyebrow: "از پیش‌نمایش تا خروجی",
    title: "خروجی واقعی.\nروی کامپیوتر خودت.",
    subtitle: "MP4، با پروژه‌ای که قابل ویرایش می‌ماند.",
    image: "export",
    width: 160,
    x: 50,
    y: 61,
    opacity: 1,
  },
  {
    seconds: 2,
    name: "پایان",
    eyebrow: "استودیوی موشن شخصی تو",
    title: "ایده بعدی\nرو بساز.",
    subtitle: "NOVA MOTION STUDIO",
    image: "editor",
    width: 145,
    x: 50,
    y: 63,
    opacity: 0.2,
  },
];
const assets: Record<string, Asset> = {};
for (const name of [
  "editor",
  "templates",
  "three-editor",
  "director",
  "export",
])
  assets[name] = await upload(
    path.join(directory, "screenshots", name + ".jpg"),
    "image/jpeg",
  );
assets.score = await upload(score(), "audio/wav");
assets.preview = await upload(
  path.resolve("examples/output/persian-business-reel.mp4"),
  "video/mp4",
);
let project: Project;
const source = path.join(directory, "project.json");
if (fs.existsSync(source))
  project = ProjectSchema.parse(JSON.parse(fs.readFileSync(source, "utf8")));
else project = createProject("business");
project.name = "NOVA — معرفی فارسی اپ";
project.description =
  "معرفی۳۰ثانیه‌ای با۵اسکرین‌شات واقعی، متن فارسی قابل ویرایش و موسیقی اورجینال. بدون گوینده.";
project.width = 1080;
project.height = 1920;
project.fps = 30;
project.assets = Object.values(assets);
project.tracks = [
  {
    id: "visual",
    name: "صحنه‌ها",
    type: "scene",
    locked: false,
    hidden: false,
    muted: false,
    solo: false,
  },
  {
    id: "design",
    name: "طراحی",
    type: "shape",
    locked: false,
    hidden: false,
    muted: false,
    solo: false,
  },
  {
    id: "screens",
    name: "اسکرین‌شات‌ها",
    type: "image",
    locked: false,
    hidden: false,
    muted: false,
    solo: false,
  },
  {
    id: "type",
    name: "تایپوگرافی",
    type: "text",
    locked: false,
    hidden: false,
    muted: false,
    solo: false,
  },
  {
    id: "preview",
    name: "نمونه رندر واقعی",
    type: "video",
    locked: false,
    hidden: false,
    muted: true,
    solo: false,
  },
  {
    id: "sound",
    name: "موسیقی",
    type: "audio",
    locked: false,
    hidden: false,
    muted: false,
    solo: false,
  },
];
function layer(
  type: Layer["type"],
  name: string,
  duration: number,
  patch: Partial<Layer> = {},
) {
  return LayerSchema.parse({
    id: uid(),
    name,
    type,
    trackId:
      type === "shape"
        ? "design"
        : type === "image"
          ? "screens"
          : type === "text"
            ? "type"
            : type === "video"
              ? "preview"
              : "sound",
    startFrame: 0,
    duration,
    animation: "none",
    ...patch,
  });
}
let start = 0;
project.scenes = shots.map((shot, i) => {
  const duration = shot.seconds * 30;
  const l: Layer[] = [];
  l.push(
    layer("shape", "پوشش طراحی پس‌زمینه", duration, {
      x: 50,
      y: 50,
      width: 120,
      height: 120,
      color: "#09090B",
      zIndex: 0,
    }),
  );
  l.push(
    layer("shape", "سربرگ", duration, {
      x: 50,
      y: 6.5,
      width: 110,
      height: 7,
      color: "#09090B",
      zIndex: 8,
    }),
  );
  l.push(
    layer("text", "NOVA identity", duration, {
      text: "NOVA  /  MOTION STUDIO",
      fontFamily: "Inter",
      fontSize: 27,
      fontWeight: 600,
      x: 31,
      y: 6.4,
      width: 48,
      align: "left",
      zIndex: 9,
      color: "#E8EDF8",
    }),
  );
  l.push(
    layer("text", "برچسب محلی", duration, {
      text: "روی کامپیوتر خودت",
      fontFamily: "Vazirmatn",
      direction: "rtl",
      fontSize: 24,
      fontWeight: 400,
      x: 77,
      y: 6.4,
      width: 30,
      align: "right",
      color: "#7D89A3",
      zIndex: 9,
    }),
  );
  l.push(
    layer("text", "تیتر فارسی", duration, {
      text: shot.title,
      x: 50,
      y: 21.7,
      width: 84,
      height: 20,
      fontFamily: "Vazirmatn",
      fontSize: i === 5 ? 78 : 88,
      fontWeight: 700,
      direction: "rtl",
      align: "right",
      color: "#F8FAFC",
      zIndex: 7,
      animation: "slide",
      keyframes: [
        {
          id: uid(),
          frame: duration - 9,
          property: "opacity",
          value: 1,
          easing: "linear",
        },
        {
          id: uid(),
          frame: duration - 1,
          property: "opacity",
          value: 0,
          easing: "ease-in",
        },
      ],
    }),
  );
  l.push(
    layer("text", "عنوان بخش", duration, {
      text: shot.eyebrow,
      x: 50,
      y: 13.8,
      width: 84,
      fontFamily: "Vazirmatn",
      fontSize: 25,
      fontWeight: 400,
      direction: "rtl",
      align: "right",
      color: "#7898FF",
      zIndex: 7,
      animation: "fade",
    }),
  );
  l.push(
    layer("text", "توضیح فارسی", duration, {
      text: shot.subtitle,
      x: 50,
      y: 31.2,
      width: 84,
      fontFamily: "Vazirmatn",
      fontSize: 29,
      fontWeight: 400,
      direction: "rtl",
      align: "right",
      color: "#9CA8BE",
      zIndex: 7,
      animation: "fade",
    }),
  );
  const image = layer("image", "تصویر واقعی: " + shot.name, duration, {
    assetId: assets[shot.image].id,
    width: shot.width,
    height: (((shot.width * 1080) / 1920) * 720) / 1280,
    x: shot.x,
    y: shot.y,
    rotation: i === 2 ? -3 : i === 4 ? 2 : -1,
    opacity: shot.opacity,
    zIndex: 2,
    keyframes: [
      {
        id: uid(),
        frame: 0,
        property: "scale",
        value: 0.95,
        easing: "ease-out",
      },
      {
        id: uid(),
        frame: duration - 1,
        property: "scale",
        value: 1.06,
        easing: "linear",
      },
      { id: uid(), frame: 0, property: "opacity", value: 0, easing: "linear" },
      {
        id: uid(),
        frame: 12,
        property: "opacity",
        value: shot.opacity,
        easing: "ease-out",
      },
      {
        id: uid(),
        frame: duration - 10,
        property: "opacity",
        value: shot.opacity,
        easing: "linear",
      },
      {
        id: uid(),
        frame: duration - 1,
        property: "opacity",
        value: 0,
        easing: "ease-in",
      },
    ],
  });
  l.push(image);
  if (i === 0 || i === 6) {
    l.push(
      layer("text", "نشان نُوا", duration, {
        text: "NOVA",
        x: 50,
        y: 55,
        width: 90,
        fontFamily: "Inter",
        fontSize: 205,
        fontWeight: 650,
        color: "#F8FAFC",
        zIndex: 5,
        animation: "spring",
        keyframes: [
          {
            id: uid(),
            frame: 0,
            property: "scale",
            value: 0.84,
            easing: "ease-out",
          },
          {
            id: uid(),
            frame: duration - 1,
            property: "scale",
            value: 1.02,
            easing: "ease-out",
          },
        ],
      }),
    );
    l.push(
      layer("text", "زیرنویس نشان", duration, {
        text:
          i === 0
            ? "CREATE. MOVE. MAKE IT YOURS."
            : "ایده تو. حرکت تو. استودیوی تو.",
        fontFamily: i === 0 ? "Inter" : "Vazirmatn",
        fontSize: i === 0 ? 22 : 36,
        fontWeight: 400,
        color: "#9FAAC3",
        x: 50,
        y: 63,
        width: 88,
        zIndex: 6,
        animation: "fade",
        direction: "auto",
      }),
    );
  }
  if (i === 3)
    l.push(
      layer("video", "نمونه سه‌بعدی ساخته شده در نُوا", duration, {
        assetId: assets.preview.id,
        x: 41,
        y: 60,
        width: 44,
        height: 44,
        trimStart: 216,
        volume: 0,
        zIndex: 6,
        rotation: 3,
        animation: "scale",
      }),
    );
  l.push(
    layer("shape", "پانوشت", duration, {
      x: 50,
      y: 90,
      width: 115,
      height: 10,
      color: "#09090B",
      zIndex: 10,
    }),
  );
  l.push(
    layer("text", "نام محصول", duration, {
      text: "NOVA  MOTION  STUDIO",
      fontFamily: "Inter",
      fontSize: 20,
      fontWeight: 450,
      x: 34,
      y: 89,
      width: 52,
      align: "left",
      color: "#7D89A3",
      zIndex: 11,
    }),
  );
  l.push(
    layer("text", "شماره صحنه", duration, {
      text: `${String(i + 1).padStart(2, "0")}  /  07`,
      fontFamily: "Inter",
      fontSize: 20,
      fontWeight: 400,
      x: 79,
      y: 89,
      width: 24,
      align: "right",
      color: "#5C7FFF",
      zIndex: 11,
    }),
  );
  l.push(
    layer("audio", "موسیقی اختصاصی معرفی نُوا", duration, {
      assetId: assets.score.id,
      trimStart: start,
      volume: 0.85,
    }),
  );
  const scene = SceneSchema.parse({
    id: uid(),
    name: shot.name,
    type: "brand",
    startFrame: start,
    duration,
    title: shot.title,
    subtitle: shot.subtitle,
    eyebrow: shot.eyebrow,
    background: "#09090B",
    accent: "#6382FF",
    transition: i === 0 ? "none" : "fade",
    transitionDuration: 9,
    effects: ["grain", "vignette", "light-sweep"],
    layers: l,
    camera: { path: "static" },
  });
  start += duration;
  return scene;
});
project.updatedAt = new Date().toISOString();
project = ProjectSchema.parse(project);
fs.writeFileSync(source, JSON.stringify(project, null, 2));
try {
  await call(api + "/api/projects/" + project.id, project, "PUT");
} catch (error) {
  if (
    String(error).includes("404") ||
    String(error).includes("No query results") ||
    String(error).includes("Not Found")
  )
    await call(api + "/api/projects", project);
  else {
    const existing: Project[] = await call(api + "/api/projects");
    if (existing.some((p) => p.id === project.id)) throw error;
    await call(api + "/api/projects", project);
  }
}
fs.writeFileSync(
  path.join(directory, "storyboard.json"),
  JSON.stringify(
    shots.map((s, i) => ({
      ...s,
      startSeconds: shots.slice(0, i).reduce((n, p) => n + p.seconds, 0),
      source: "http://127.0.0.1:5173/",
      screenshot: "screenshots/" + s.image + ".jpg",
      capture:
        "Actual browser viewport1280×720, no browser chrome; no repainting. Motion/crops happen only in the video compositor.",
    })),
    null,
    2,
  ),
);
fs.writeFileSync(
  path.join(directory, "script-fa.txt"),
  shots
    .map((s) => s.title.replaceAll("\n", " ") + ". " + s.subtitle)
    .join("\n"),
);
console.log(
  JSON.stringify(
    {
      projectId: project.id,
      duration: 30,
      frames: 900,
      assets: project.assets.length,
      source,
      hash: createHash("sha256").update(JSON.stringify(project)).digest("hex"),
    },
    null,
    2,
  ),
);
if (process.argv.includes("--render")) {
  const frame = await call(worker + "/worker/frame", {
    project,
    preset: "draft",
    frame: 330,
  });
  const contact = await call(worker + "/worker/contact-sheet", {
    project,
    preset: "draft",
  });
  fs.writeFileSync(
    path.join(directory, "review-jobs.json"),
    JSON.stringify({ frame: frame.id, contact: contact.id }, null, 2),
  );
  console.log("Review jobs:", frame.id, contact.id);
}
