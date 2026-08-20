"use client";

import { useMemo, useState, useTransition } from "react";
import { PRESETS } from "@/lib/presets";
import type {
  ExportFormat,
  FieldDef,
  ScrapeMode,
  ScrapeRequest,
  ScrapeResult,
  ScrapeRow,
} from "@/lib/types";
import { LIMITS } from "@/lib/types";

const emptyField = (): FieldDef => ({ label: "", path: "" });

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [urlsText, setUrlsText] = useState("");
  const [mode, setMode] = useState<ScrapeMode>("html");
  const [itemSelector, setItemSelector] = useState("article");
  const [fields, setFields] = useState<FieldDef[]>([
    { label: "titulo", path: "h2, h3" },
    { label: "enlace", path: "a@href" },
  ]);
  const [imageSelector, setImageSelector] = useState("img@src");
  const [imageBaseUrl, setImageBaseUrl] = useState("");
  const [listPath, setListPath] = useState("");
  const [method, setMethod] = useState<"GET" | "POST">("GET");
  const [contentType, setContentType] = useState<"form" | "json" | "none">("none");
  const [formFieldsText, setFormFieldsText] = useState("");
  const [jsonBodyText, setJsonBodyText] = useState("{}");

  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [rows, setRows] = useState<ScrapeRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const columns = useMemo(() => {
    if (!rows.length) return [] as string[];
    return Object.keys(rows[0].data);
  }, [rows]);

  function applyPreset(id: string) {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    const c = preset.config;
    setUrlsText(c.urls.join("\n"));
    setMode(c.mode ?? "html");
    setItemSelector(c.itemSelector ?? "");
    setFields(c.fields?.length ? c.fields.map((f) => ({ ...f })) : [emptyField()]);
    setImageSelector(c.imageSelector ?? "");
    setImageBaseUrl(c.imageBaseUrl ?? "");
    setListPath(c.listPath ?? "");
    setMethod(c.method ?? "GET");
    setContentType(c.contentType ?? "none");
    setFormFieldsText(
      c.formFields
        ? Object.entries(c.formFields)
            .map(([k, v]) => `${k}=${v}`)
            .join("\n")
        : "",
    );
    setJsonBodyText(
      c.jsonBody != null ? JSON.stringify(c.jsonBody, null, 2) : "{}",
    );
    setError(null);
    setStatus(`Preset «${preset.name}» aplicado.`);
  }

  function buildRequest(): ScrapeRequest {
    const urls = urlsText
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    const formFields: Record<string, string> = {};
    for (const line of formFieldsText.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      formFields[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }

    let jsonBody: unknown = undefined;
    if (mode === "json" && contentType === "json") {
      jsonBody = JSON.parse(jsonBodyText || "{}");
    }

    return {
      urls,
      mode,
      itemSelector: itemSelector || undefined,
      fields: fields.filter((f) => f.label.trim() && f.path.trim()),
      imageSelector: imageSelector || undefined,
      imageBaseUrl: imageBaseUrl || undefined,
      listPath: listPath || undefined,
      method,
      contentType: mode === "json" ? contentType : undefined,
      formFields: Object.keys(formFields).length ? formFields : undefined,
      jsonBody,
    };
  }

  function onScrape() {
    setError(null);
    setStatus(null);
    startTransition(async () => {
      try {
        const payload = buildRequest();
        const res = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "No se pudo scrapear");
        }
        const scraped = data as ScrapeResult;
        setResult(scraped);
        setRows(scraped.rows);
        setStatus(
          `${scraped.rows.length} filas · ${scraped.images.length} imágenes` +
            (scraped.truncated ? " (truncado)" : ""),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  async function onExport(format: ExportFormat) {
    setError(null);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, rows }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Exportación fallida");
      }
      const blob = await res.blob();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `pullsheet-${stamp}.${format}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function onExportImages() {
    setError(null);
    const urls =
      result?.images?.length
        ? result.images
        : [...new Set(rows.flatMap((r) => r.images))];
    if (!urls.length) {
      setError("No hay imágenes para empaquetar.");
      return;
    }
    try {
      const res = await fetch("/api/export-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "ZIP fallido");
      }
      const blob = await res.blob();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `pullsheet-images-${stamp}.zip`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateField(index: number, patch: Partial<FieldDef>) {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
      <header className="animate-rise max-w-2xl">
        <p className="mb-3 text-sm font-medium tracking-[0.2em] text-[var(--accent)] uppercase">
          Pullsheet
        </p>
        <h1
          className="font-[family-name:var(--font-fraunces)] text-4xl leading-[1.1] font-semibold tracking-tight text-[var(--sand)] sm:text-5xl"
        >
          Pullsheet
        </h1>
        <div className="accent-line mt-5 mb-5" />
        <p className="animate-rise-delay max-w-xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
          Pega el enlace, define qué quieres sacar y descarga la tabla o las
          fotos. Hecho para catálogos frágiles: HTML, render JS o API JSON.
        </p>
      </header>

      <section className="animate-rise-delay flex flex-col gap-6">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-2 text-sm">
            <span className="text-[var(--muted)]">Preset de ayuda</span>
            <select
              className="rounded-md border border-[var(--line)] bg-[rgba(42,15,61,0.65)] px-3 py-2.5 outline-none focus:border-[var(--accent)]"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) applyPreset(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="" disabled>
                Elegir preset…
              </option>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[10rem] flex-col gap-2 text-sm">
            <span className="text-[var(--muted)]">Modo</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ScrapeMode)}
              className="rounded-md border border-[var(--line)] bg-[rgba(42,15,61,0.65)] px-3 py-2.5 outline-none focus:border-[var(--accent)]"
            >
              <option value="html">HTML estático</option>
              <option value="js">Renderizar JavaScript</option>
              <option value="json">JSON API</option>
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm">
          <span className="text-[var(--muted)]">
            URL(s) — una por línea (máx. {LIMITS.maxUrls})
          </span>
          <textarea
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            rows={3}
            placeholder="https://…"
            className="rounded-md border border-[var(--line)] bg-[rgba(42,15,61,0.65)] px-3 py-2.5 font-mono text-[13px] outline-none focus:border-[var(--accent)]"
          />
        </label>

        {mode !== "json" ? (
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-[var(--muted)]">
              Selector de ítem (CSS). Vacío = una fila por página
            </span>
            <input
              value={itemSelector}
              onChange={(e) => setItemSelector(e.target.value)}
              placeholder="article, .product, li.item…"
              className="rounded-md border border-[var(--line)] bg-[rgba(42,15,61,0.65)] px-3 py-2.5 font-mono text-[13px] outline-none focus:border-[var(--accent)]"
            />
          </label>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-[var(--muted)]">Ruta del array (listPath)</span>
              <input
                value={listPath}
                onChange={(e) => setListPath(e.target.value)}
                placeholder="refacciones"
                className="rounded-md border border-[var(--line)] bg-[rgba(42,15,61,0.65)] px-3 py-2.5 font-mono text-[13px] outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-[var(--muted)]">Método</span>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as "GET" | "POST")}
                className="rounded-md border border-[var(--line)] bg-[rgba(42,15,61,0.65)] px-3 py-2.5 outline-none focus:border-[var(--accent)]"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-[var(--muted)]">Cuerpo</span>
              <select
                value={contentType}
                onChange={(e) =>
                  setContentType(e.target.value as "form" | "json" | "none")
                }
                className="rounded-md border border-[var(--line)] bg-[rgba(42,15,61,0.65)] px-3 py-2.5 outline-none focus:border-[var(--accent)]"
              >
                <option value="none">Sin cuerpo</option>
                <option value="form">FormData (clave=valor)</option>
                <option value="json">JSON</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-[var(--muted)]">Base de imágenes</span>
              <input
                value={imageBaseUrl}
                onChange={(e) => setImageBaseUrl(e.target.value)}
                placeholder="https://cdn.example.com/"
                className="rounded-md border border-[var(--line)] bg-[rgba(42,15,61,0.65)] px-3 py-2.5 font-mono text-[13px] outline-none focus:border-[var(--accent)]"
              />
            </label>
            {contentType === "form" && (
              <label className="flex flex-col gap-2 text-sm sm:col-span-2">
                <span className="text-[var(--muted)]">
                  Campos form (una línea clave=valor)
                </span>
                <textarea
                  value={formFieldsText}
                  onChange={(e) => setFormFieldsText(e.target.value)}
                  rows={3}
                  className="rounded-md border border-[var(--line)] bg-[rgba(42,15,61,0.65)] px-3 py-2.5 font-mono text-[13px] outline-none focus:border-[var(--accent)]"
                />
              </label>
            )}
            {contentType === "json" && (
              <label className="flex flex-col gap-2 text-sm sm:col-span-2">
                <span className="text-[var(--muted)]">JSON body</span>
                <textarea
                  value={jsonBodyText}
                  onChange={(e) => setJsonBodyText(e.target.value)}
                  rows={4}
                  className="rounded-md border border-[var(--line)] bg-[rgba(42,15,61,0.65)] px-3 py-2.5 font-mono text-[13px] outline-none focus:border-[var(--accent)]"
                />
              </label>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-medium">
              Campos
            </h2>
            <button
              type="button"
              onClick={() => setFields((f) => [...f, emptyField()])}
              className="text-sm text-[var(--accent)] underline-offset-4 hover:underline"
            >
              + campo
            </button>
          </div>
          <p className="text-sm text-[var(--muted)]">
            {mode === "json"
              ? "path = propiedad relativa a cada ítem (ej. re_descripcion)."
              : "path = selector CSS; usa @attr para atributos (ej. a@href, img@src)."}
          </p>
          <div className="flex flex-col gap-2">
            {fields.map((field, i) => (
              <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                <input
                  value={field.label}
                  onChange={(e) => updateField(i, { label: e.target.value })}
                  placeholder="nombre"
                  className="rounded-md border border-[var(--line)] bg-[rgba(42,15,61,0.65)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
                <input
                  value={field.path}
                  onChange={(e) => updateField(i, { path: e.target.value })}
                  placeholder={mode === "json" ? "re_precio" : "h2, .title"}
                  className="rounded-md border border-[var(--line)] bg-[rgba(42,15,61,0.65)] px-3 py-2 font-mono text-[13px] outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  aria-label="Quitar campo"
                  onClick={() =>
                    setFields((prev) =>
                      prev.length === 1 ? prev : prev.filter((_, j) => j !== i),
                    )
                  }
                  className="px-2 text-[var(--muted)] hover:text-[var(--danger)]"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-[var(--muted)]">Selector / path de imágenes</span>
            <input
              value={imageSelector}
              onChange={(e) => setImageSelector(e.target.value)}
              placeholder={mode === "json" ? "re_path_img" : "img@src"}
              className="rounded-md border border-[var(--line)] bg-[rgba(42,15,61,0.65)] px-3 py-2.5 font-mono text-[13px] outline-none focus:border-[var(--accent)]"
            />
          </label>
          {mode !== "json" && (
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-[var(--muted)]">Base de imágenes (opcional)</span>
              <input
                value={imageBaseUrl}
                onChange={(e) => setImageBaseUrl(e.target.value)}
                placeholder="https://…"
                className="rounded-md border border-[var(--line)] bg-[rgba(42,15,61,0.65)] px-3 py-2.5 font-mono text-[13px] outline-none focus:border-[var(--accent)]"
              />
            </label>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onScrape}
            disabled={pending}
            className="rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--accent-deep)] disabled:opacity-60"
          >
            {pending ? "Scrapeando…" : "Scrapear"}
          </button>
          <p className="text-xs text-[var(--muted)]">
            Límite: {LIMITS.maxItems} filas · {LIMITS.maxImages} imágenes por job
          </p>
        </div>

        {error && (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        )}
        {status && !error && (
          <p className="text-sm text-[var(--ok)]">{status}</p>
        )}
        {result?.warnings?.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--accent)]">
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
      </section>

      {rows.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-medium">
              Vista previa
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onExport("csv")}
                className="rounded-md border border-[var(--line)] px-3 py-2 text-sm hover:border-[var(--accent)]"
              >
                CSV
              </button>
              <button
                type="button"
                onClick={() => onExport("xlsx")}
                className="rounded-md border border-[var(--line)] px-3 py-2 text-sm hover:border-[var(--accent)]"
              >
                XLSX
              </button>
              <button
                type="button"
                onClick={() => onExport("pdf")}
                className="rounded-md border border-[var(--line)] px-3 py-2 text-sm hover:border-[var(--accent)]"
              >
                PDF
              </button>
              <button
                type="button"
                onClick={onExportImages}
                className="rounded-md border border-[var(--accent)] px-3 py-2 text-sm text-[var(--accent)] hover:bg-[rgba(227,162,58,0.12)]"
              >
                ZIP fotos
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-[var(--line)]">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-[rgba(61,26,92,0.9)]">
                <tr>
                  <th className="px-3 py-2.5 font-medium text-[var(--muted)]">#</th>
                  {columns.map((c) => (
                    <th
                      key={c}
                      className="px-3 py-2.5 font-medium text-[var(--muted)]"
                    >
                      {c}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 font-medium text-[var(--muted)]">
                    imgs
                  </th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={`${row.sourceUrl}-${i}`}
                    className="border-t border-[var(--line)] odd:bg-[rgba(42,15,61,0.35)]"
                  >
                    <td className="px-3 py-2 align-top text-[var(--muted)]">
                      {i + 1}
                    </td>
                    {columns.map((c) => (
                      <td key={c} className="max-w-[16rem] truncate px-3 py-2 align-top">
                        {row.data[c]}
                      </td>
                    ))}
                    <td className="px-3 py-2 align-top text-[var(--muted)]">
                      {row.images.length}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="text-[var(--muted)] hover:text-[var(--danger)]"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <footer className="mt-auto border-t border-[var(--line)] pt-6 text-xs leading-relaxed text-[var(--muted)]">
        Usa Pullsheet solo en sitios donde tengas permiso. Respeta términos de
        servicio, robots.txt y derechos de autor de las fotografías. Los
        archivos se descargan a tu navegador (CSV / XLSX / PDF / ZIP); no se
        escriben carpetas locales del sistema.
      </footer>
    </main>
  );
}
