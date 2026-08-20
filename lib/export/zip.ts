import JSZip from "jszip";
import { LIMITS, USER_AGENT } from "../types";

function filenameFromUrl(url: string, index: number): string {
  try {
    const u = new URL(url);
    const base = u.pathname.split("/").filter(Boolean).pop() || `image-${index}`;
    const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_");
    return cleaned.includes(".") ? cleaned : `${cleaned}.jpg`;
  } catch {
    return `image-${index}.jpg`;
  }
}

export async function imagesToZipBuffer(urls: string[]): Promise<{
  buffer: Buffer;
  saved: number;
  failed: string[];
}> {
  const zip = new JSZip();
  const folder = zip.folder("images");
  if (!folder) throw new Error("No se pudo crear la carpeta ZIP.");

  const slice = urls.slice(0, LIMITS.maxImages);
  const failed: string[] = [];
  let saved = 0;
  const usedNames = new Set<string>();

  for (let i = 0; i < slice.length; i++) {
    const url = slice[i];
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), LIMITS.fetchTimeoutMs);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT, Accept: "image/*,*/*" },
      });
      clearTimeout(timer);
      if (!res.ok) {
        failed.push(url);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      let name = filenameFromUrl(url, i + 1);
      if (usedNames.has(name)) name = `${i + 1}-${name}`;
      usedNames.add(name);
      folder.file(name, buf);
      saved += 1;
    } catch {
      failed.push(url);
    }
  }

  const buffer = Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
  return { buffer, saved, failed };
}
