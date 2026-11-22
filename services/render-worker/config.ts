export function clampConcurrency(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(1, Math.min(4, Math.floor(n))) : 2;
}
export function resolveFrameConcurrency(
  settings: { concurrency?: unknown } | null,
  environmentValue = process.env.NOVA_RENDER_CONCURRENCY,
): number {
  return clampConcurrency(
    environmentValue?.trim() ? environmentValue : (settings?.concurrency ?? 2),
  );
}
export async function readFrameConcurrency(): Promise<number> {
  if (process.env.NOVA_RENDER_CONCURRENCY?.trim())
    return resolveFrameConcurrency(null);
  try {
    const token = process.env.NOVA_API_TOKEN;
    const response = await fetch("http://127.0.0.1:8000/api/settings", {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return 2;
    const settings = (await response.json()) as { concurrency?: unknown };
    return resolveFrameConcurrency(settings);
  } catch {
    return 2;
  }
}
