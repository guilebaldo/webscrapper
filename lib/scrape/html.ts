import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { FieldDef, ScrapeRow } from "../types";

/** Selector with optional @attr suffix, e.g. "a@href" or "img@src". */
export function parseSelector(raw: string): { selector: string; attr?: string } {
  const at = raw.lastIndexOf("@");
  if (at > 0) {
    return { selector: raw.slice(0, at).trim(), attr: raw.slice(at + 1).trim() };
  }
  return { selector: raw.trim() };
}

function absoluteUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

function readValue(
  $: cheerio.CheerioAPI,
  el: Element,
  fieldPath: string,
  pageUrl: string,
): string {
  const { selector, attr } = parseSelector(fieldPath);
  const scope = $(el);
  const target = selector ? scope.find(selector).first() : scope;
  if (!target.length) return "";

  let value = "";
  if (attr) {
    value = target.attr(attr) ?? "";
  } else {
    value = target.text().replace(/\s+/g, " ").trim();
  }

  if (attr && (attr === "href" || attr === "src" || attr === "data-src") && value) {
    return absoluteUrl(value, pageUrl);
  }
  return value;
}

function readImages(
  $: cheerio.CheerioAPI,
  el: Element,
  imageSelector: string | undefined,
  pageUrl: string,
  imageBaseUrl?: string,
): string[] {
  if (!imageSelector) return [];
  const { selector, attr } = parseSelector(imageSelector);
  const attrName = attr || "src";
  const nodes = selector ? $(el).find(selector) : $(el);
  const base = imageBaseUrl || pageUrl;
  const out: string[] = [];

  nodes.each((_, node) => {
    const $n = $(node);
    const raw =
      $n.attr(attrName) ||
      $n.attr("data-src") ||
      $n.attr("data-lazy-src") ||
      $n.attr("src") ||
      "";
    if (!raw || raw.startsWith("data:")) return;
    out.push(absoluteUrl(raw, base));
  });

  return [...new Set(out)];
}

export function extractHtmlRows(
  html: string,
  pageUrl: string,
  itemSelector: string | undefined,
  fields: FieldDef[],
  imageSelector: string | undefined,
  imageBaseUrl: string | undefined,
  maxItems: number,
): { rows: ScrapeRow[]; truncated: boolean } {
  const $ = cheerio.load(html);
  const items: Element[] = itemSelector
    ? ($(itemSelector).toArray() as Element[])
    : (($("body").children().toArray() as Element[]).length
        ? ($("body").children().toArray() as Element[])
        : ($("html").toArray() as Element[]));

  const truncated = items.length > maxItems;
  const slice = items.slice(0, maxItems);

  const rows: ScrapeRow[] = slice.map((el) => {
    const data: Record<string, string> = {};
    for (const field of fields) {
      data[field.label] = readValue($, el, field.path, pageUrl);
    }
    return {
      sourceUrl: pageUrl,
      data,
      images: readImages($, el, imageSelector, pageUrl, imageBaseUrl),
    };
  });

  return { rows, truncated };
}
