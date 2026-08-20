import { LIMITS, USER_AGENT } from "../types";
import type { ScrapeRequest } from "../types";

export async function fetchText(
  url: string,
  init?: RequestInit,
): Promise<{ body: string; contentType: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIMITS.fetchTimeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "*/*",
        ...(init?.headers ?? {}),
      },
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} al pedir ${url}`);
    }
    const contentType = res.headers.get("content-type") ?? "";
    const body = await res.text();
    return { body, contentType };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJsonApi(
  url: string,
  req: Pick<ScrapeRequest, "method" | "contentType" | "formFields" | "jsonBody">,
): Promise<unknown> {
  const method = req.method ?? "GET";
  let body: BodyInit | undefined;
  const headers: Record<string, string> = {};

  if (method !== "GET") {
    if (req.contentType === "json") {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(req.jsonBody ?? {});
    } else if (req.contentType === "form" || req.formFields) {
      const fd = new FormData();
      for (const [k, v] of Object.entries(req.formFields ?? {})) {
        fd.append(k, v);
      }
      body = fd;
    }
  }

  const { body: text, contentType } = await fetchText(url, {
    method,
    headers,
    body,
  });

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `La respuesta no es JSON válido (${contentType || "sin content-type"}).`,
    );
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
