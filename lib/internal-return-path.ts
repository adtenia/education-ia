export const DEFAULT_RETURN_PATH = "/";

const INTERNAL_ORIGIN = "https://educationia.internal";

export function normalizeInternalReturnPath(value: unknown) {
  if (typeof value !== "string") return DEFAULT_RETURN_PATH;

  const candidate = value.trim();

  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /https?:\/\//i.test(candidate)
  ) {
    return DEFAULT_RETURN_PATH;
  }

  try {
    const parsed = new URL(candidate, INTERNAL_ORIGIN);

    if (parsed.origin !== INTERNAL_ORIGIN) return DEFAULT_RETURN_PATH;

    return `${parsed.pathname}${parsed.search}` || DEFAULT_RETURN_PATH;
  } catch {
    return DEFAULT_RETURN_PATH;
  }
}
