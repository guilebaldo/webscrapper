/** Resolve a dotted path; supports simple keys and numeric indices. */
export function getByPath(obj: unknown, path: string): unknown {
  if (!path || path === ".") return obj;
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export function asString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

export function extractJsonRows(
  payload: unknown,
  listPath: string | undefined,
  fields: { label: string; path: string }[],
  imagePath: string | undefined,
  imageBaseUrl: string | undefined,
  sourceUrl: string,
  maxItems: number,
): { rows: { sourceUrl: string; data: Record<string, string>; images: string[] }[]; truncated: boolean } {
  const resolved = listPath ? getByPath(payload, listPath) : payload;
  const list: unknown[] = Array.isArray(resolved)
    ? resolved
    : [resolved ?? payload];

  const truncated = list.length > maxItems;
  const slice = list.slice(0, maxItems);
  const base = imageBaseUrl?.replace(/\/?$/, "/") ?? "";

  const rows = slice.map((item) => {
    const data: Record<string, string> = {};
    for (const field of fields) {
      data[field.label] = asString(getByPath(item, field.path));
    }
    const images: string[] = [];
    if (imagePath) {
      const raw = getByPath(item, imagePath);
      const urls = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
      for (const u of urls) {
        const s = asString(u).trim();
        if (!s) continue;
        images.push(s.startsWith("http") ? s : `${base}${s.replace(/^\//, "")}`);
      }
    }
    return { sourceUrl, data, images };
  });

  return { rows, truncated };
}
