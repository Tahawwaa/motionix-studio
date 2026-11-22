import {
  rescaleFps,
  ProjectSchema,
  type Asset,
  type Project,
} from "../../../packages/project-schema";
import { createProject } from "../../../packages/templates";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function authHeaders(): Record<string, string> {
  const token =
    typeof sessionStorage === "undefined"
      ? null
      : sessionStorage.getItem("nova-api-token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
export async function downloadFile(path: string, name?: string) {
  const r = await fetch(path, { headers: authHeaders() });
  if (!r.ok) throw new ApiError(`Download failed (${r.status})`, r.status);
  const url = URL.createObjectURL(await r.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = name ?? path.split("/").at(-1) ?? "nova-export";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  if (!r.ok) {
    const b = await r.json().catch(() => ({ message: r.statusText }));
    throw new ApiError(
      b.message || b.error || `Request failed (${r.status})`,
      r.status,
    );
  }
  if (r.status === 204) return undefined as T;
  return r.json();
}
export const api = {
  projects: () => request<Project[]>("/api/projects"),
  save: (p: Project) =>
    request<Project>(`/api/projects/${p.id}`, {
      method: "PUT",
      body: JSON.stringify(p),
    }),
  create: (p: Project) =>
    request<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify(p),
    }),
  assets: () => request<Asset[]>("/api/assets"),
  upload: (file: File) => {
    const f = new FormData();
    f.append("file", file);
    return request<Asset>("/api/assets", { method: "POST", body: f });
  },
};
export type RenderJob = {
  id: string;
  projectId: string;
  projectName: string;
  status: string;
  progress: number;
  logs: string[];
  createdAt: string;
  output?: string;
  error?: string;
  format?: string;
  preset?: string;
  elapsed?: number;
};
export const jsonDownload = (value: unknown, name: string) => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
};
export async function configuredProject(
  templateId = "website",
): Promise<Project> {
  let p = createProject(templateId);
  try {
    const settings = await request<{
      defaultWidth: number;
      defaultHeight: number;
      defaultFps: Project["fps"];
    }>("/api/settings");
    p = rescaleFps(p, settings.defaultFps);
    p.width = settings.defaultWidth;
    p.height = settings.defaultHeight;
  } catch {
    /* Creation still uses valid built-in defaults if preferences cannot load. */
  }
  return ProjectSchema.parse(p);
}
