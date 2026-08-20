import { LIMITS } from "../types";
import type { ScrapeRequest, ScrapeResult, ScrapeRow } from "../types";
import { renderPageHtml } from "./browser";
import { fetchJsonApi, fetchText, sleep } from "./fetch";
import { extractHtmlRows } from "./html";
import { extractJsonRows } from "./json";
import { USER_AGENT } from "../types";

function normalizeUrls(urls: string[]): string[] {
  return urls
    .map((u) => u.trim())
    .filter(Boolean)
    .slice(0, LIMITS.maxUrls);
}

function collectImages(rows: ScrapeRow[], maxImages: number): {
  images: string[];
  truncated: boolean;
} {
  const seen = new Set<string>();
  const images: string[] = [];
  for (const row of rows) {
    for (const img of row.images) {
      if (seen.has(img)) continue;
      seen.add(img);
      if (images.length < maxImages) images.push(img);
    }
  }
  const totalUnique = seen.size;
  return { images, truncated: totalUnique > maxImages };
}

export async function runScrape(req: ScrapeRequest): Promise<ScrapeResult> {
  const urls = normalizeUrls(req.urls);
  if (!urls.length) {
    throw new Error("Indica al menos una URL.");
  }
  if (!req.fields?.length) {
    throw new Error("Define al menos un campo a extraer.");
  }

  const warnings: string[] = [];
  const allRows: ScrapeRow[] = [];
  let truncated = false;

  for (let i = 0; i < urls.length; i++) {
    if (i > 0) await sleep(LIMITS.requestDelayMs);
    const url = urls[i];

    if (req.mode === "json") {
      const payload = await fetchJsonApi(url, req);
      const { rows, truncated: t } = extractJsonRows(
        payload,
        req.listPath,
        req.fields,
        req.imageSelector,
        req.imageBaseUrl,
        url,
        LIMITS.maxItems - allRows.length,
      );
      if (t || allRows.length + rows.length >= LIMITS.maxItems) truncated = true;
      allRows.push(...rows);
    } else {
      let html: string;
      if (req.mode === "js") {
        try {
          html = await renderPageHtml(url, LIMITS.fetchTimeoutMs, USER_AGENT);
        } catch (err) {
          warnings.push(
            `Render JS falló en ${url}: ${err instanceof Error ? err.message : String(err)}. Prueba modo HTML o JSON API.`,
          );
          continue;
        }
      } else {
        const fetched = await fetchText(url);
        html = fetched.body;
        if (!html.includes("<") && fetched.contentType.includes("json")) {
          warnings.push(
            `${url} parece JSON; cambia a modo JSON API para mapear campos.`,
          );
        }
      }

      const remaining = LIMITS.maxItems - allRows.length;
      if (remaining <= 0) {
        truncated = true;
        break;
      }

      const { rows, truncated: t } = extractHtmlRows(
        html,
        url,
        req.itemSelector,
        req.fields,
        req.imageSelector,
        req.imageBaseUrl,
        remaining,
      );
      if (t) truncated = true;
      allRows.push(...rows);
    }

    if (allRows.length >= LIMITS.maxItems) {
      truncated = true;
      break;
    }
  }

  const { images, truncated: imgTrunc } = collectImages(
    allRows,
    LIMITS.maxImages,
  );
  if (imgTrunc) truncated = true;

  if (truncated) {
    warnings.push(
      `Resultado limitado a ${LIMITS.maxItems} filas y ${LIMITS.maxImages} imágenes por job.`,
    );
  }

  return { rows: allRows, images, truncated, warnings };
}
