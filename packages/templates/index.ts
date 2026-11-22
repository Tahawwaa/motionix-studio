import {
  ProjectSchema,
  SceneSchema,
  LayerSchema,
  defaultBrand,
  uid,
  type Project,
  type Scene,
} from "../project-schema/index";
export type Template = {
  id: string;
  name: string;
  description: string;
  category: string;
  type: Scene["type"];
  accent: string;
  duration: number;
};
export const templates: Template[] = [
  {
    id: "website",
    name: "Cinematic Website Showcase",
    description: "Perspective browser, floating UI, editorial type.",
    category: "Website",
    type: "website",
    accent: "#607CFF",
    duration: 20,
  },
  {
    id: "saas",
    name: "Luxury SaaS Commercial",
    description: "Living analytics, precision cards, a new perspective.",
    category: "SaaS",
    type: "saas",
    accent: "#A3E635",
    duration: 30,
  },
  {
    id: "glass",
    name: "Floating Glass UI",
    description: "Translucent layers suspended in a quiet atmosphere.",
    category: "Motion",
    type: "glass",
    accent: "#67E8F9",
    duration: 18,
  },
  {
    id: "product",
    name: "Product, Elevated",
    description: "Sculptural geometry and confident product storytelling.",
    category: "Product",
    type: "product",
    accent: "#E2E8F0",
    duration: 20,
  },
  {
    id: "mobile",
    name: "Mobile Application Showcase",
    description: "A floating phone. A beautifully focused story.",
    category: "Product",
    type: "mobile",
    accent: "#F0ABFC",
    duration: 18,
  },
  {
    id: "tech",
    name: "Dark Technology Commercial",
    description: "Architectural grids, electric depth, kinetic precision.",
    category: "Brand",
    type: "tech",
    accent: "#22D3EE",
    duration: 20,
  },
  {
    id: "typography",
    name: "Kinetic Typography Reel",
    description: "Big ideas in bold, beautifully moving type.",
    category: "Motion",
    type: "typography",
    accent: "#FB7185",
    duration: 15,
  },
  {
    id: "education",
    name: "Ideas in Motion",
    description: "Make complex ideas clear with animated diagrams.",
    category: "Education",
    type: "education",
    accent: "#FBBF24",
    duration: 24,
  },
  {
    id: "before-after",
    name: "Website Before & After",
    description: "A split-screen transformation worth sharing.",
    category: "Website",
    type: "before-after",
    accent: "#818CF8",
    duration: 20,
  },
  {
    id: "brand",
    name: "Premium Brand Reveal",
    description: "A singular identity. An unforgettable entrance.",
    category: "Brand",
    type: "brand",
    accent: "#C4B5FD",
    duration: 12,
  },
  {
    id: "orbit",
    name: "3D Product Orbit",
    description: "Real dimensional geometry, light, and camera choreography.",
    category: "Product",
    type: "orbit",
    accent: "#38BDF8",
    duration: 18,
  },
  {
    id: "business",
    name: "Cinematic Business Advertisement",
    description: "Persian-first storytelling for an ambitious business.",
    category: "Business",
    type: "business",
    accent: "#2563EB",
    duration: 18,
  },
];
const copy: Record<Scene["type"], [string, string, string]> = {
  website: [
    "Make your\nfirst impression\nunforgettable.",
    "Digital experiences, designed to move people.",
    "BUILT FOR WHAT’S NEXT",
  ],
  saas: [
    "Less friction.\nMore possibility.",
    "One workspace. Your next breakthrough.",
    "A BETTER WAY TO WORK",
  ],
  glass: [
    "Clarity,\nin every layer.",
    "A fresh perspective on your digital world.",
    "BEYOND THE SURFACE",
  ],
  product: [
    "An object.\nAn obsession.",
    "Crafted with purpose. Designed to last.",
    "FORM MEETS FEELING",
  ],
  mobile: [
    "Your world.\nIn your hands.",
    "Thoughtfully connected. Effortlessly yours.",
    "MEET YOUR EVERYDAY",
  ],
  tech: [
    "The future\nis taking shape.",
    "A new dimension of digital possibility.",
    "ENGINEERED FOR TOMORROW",
  ],
  typography: [
    "MAKE\nSOMETHING\nMATTER.",
    "Ideas deserve to be seen.",
    "WORDS IN MOTION",
  ],
  education: [
    "Small steps.\nExtraordinary\nprogress.",
    "Understand. Create. Grow.",
    "A LITTLE MORE EVERY DAY",
  ],
  "before-after": [
    "A better website.\nA bigger future.",
    "The difference is in the details.",
    "THE POWER OF DESIGN",
  ],
  brand: [
    "Extraordinary,\nby design.",
    "An identity that moves with you.",
    "INTRODUCING NOVA",
  ],
  orbit: [
    "Every angle.\nAn advantage.",
    "Explore a new dimension of possibility.",
    "DESIGNED TO STAND APART",
  ],
  business: [
    "وب‌سایت شما،\nشروع یک داستان\nبزرگ‌تر.",
    "طراحی حرفه‌ای، برای کسب‌وکارهای آینده‌نگر",
    "طراحی وب‌سایت حرفه‌ای",
  ],
};
export function createScene(
  type: Scene["type"] = "website",
  startFrame = 0,
  duration = 180,
): Scene {
  const [title, subtitle, eyebrow] = copy[type];
  const spec = templates.find((t) => t.type === type)!;
  return SceneSchema.parse({
    id: uid(),
    name: spec.name,
    type,
    startFrame,
    duration,
    title,
    subtitle,
    eyebrow,
    accent: spec.accent,
    camera: {
      path: type === "product" || type === "tech" ? "dolly-in" : "orbit",
    },
    effects:
      type === "tech"
        ? ["grain", "vignette", "scanlines"]
        : ["grain", "vignette"],
  });
}
export function createProject(templateId = "website"): Project {
  const spec = templates.find((t) => t.id === templateId) || templates[0];
  const now = new Date().toISOString();
  const fps = 30;
  const n = spec.duration * fps;
  const chunks =
    spec.type === "brand"
      ? [n]
      : [
          Math.round(n * 0.4),
          Math.round(n * 0.35),
          n - Math.round(n * 0.4) - Math.round(n * 0.35),
        ];
  let start = 0;
  const scenes = chunks.map((d, i) => {
    const s = createScene(spec.type, start, d);
    start += d;
    if (i === 1) {
      s.name = "A closer look";
      s.title =
        spec.type === "business"
          ? "زیبایی در جزئیات."
          : "Details that\nmake the difference.";
      s.subtitle =
        spec.type === "business"
          ? "سریع، زیبا و قابل اعتماد"
          : "Thoughtfully crafted. Effortlessly connected.";
      s.camera.path = "dolly-in";
      s.transition = "zoom";
    }
    if (i === 2) {
      s.name = "The invitation";
      s.type = "brand";
      s.title =
        spec.type === "business"
          ? "آینده کسب‌وکارت\nاز اینجا شروع می‌شه."
          : "Your next chapter\nstarts here.";
      s.subtitle =
        spec.type === "business"
          ? "برای شروع، پیام بدهید"
          : "Let’s make something extraordinary.";
      s.eyebrow = spec.type === "business" ? "با هم بسازیم" : "LET’S CREATE";
    }
    return s;
  });
  return ProjectSchema.parse({
    schemaVersion: 1,
    id: uid(),
    name: spec.name,
    description: spec.description,
    width: 1080,
    height: 1920,
    fps,
    scenes,
    tracks: [
      { id: "visual", name: "Scenes", type: "scene" },
      { id: "type", name: "Typography", type: "text" },
      { id: "media", name: "Media", type: "image" },
      { id: "sound", name: "Sound design", type: "audio" },
    ],
    assets: [],
    brand: {
      ...defaultBrand,
      primary: spec.accent,
      font: spec.type === "business" ? "Vazirmatn" : "Inter",
    },
    archived: false,
    createdAt: now,
    updatedAt: now,
  });
}
export function demoProjects(): Project[] {
  const website = createProject("website");
  website.name = "01 — Website Commercial";
  const saas = createProject("saas");
  saas.name = "02 — SaaS Product Commercial";
  const persian = createProject("business");
  persian.name = "03 — Persian Business Reel";
  return [website, saas, persian];
}
export function addTextOverlay(scene: Scene, text: string): Scene {
  return {
    ...scene,
    layers: [
      ...scene.layers,
      LayerSchema.parse({
        id: uid(),
        name: text.slice(0, 30),
        type: "text",
        trackId: "type",
        startFrame: 0,
        duration: scene.duration,
        text,
        y: 78,
        fontSize: 70,
      }),
    ],
  };
}
