import type { ScrapeRow } from "../types";

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowsToCsv(rows: ScrapeRow[]): string {
  if (!rows.length) return "";
  const labels = Object.keys(rows[0].data);
  const header = ["sourceUrl", ...labels, "images"].map(escapeCsv).join(",");
  const lines = rows.map((row) => {
    const cells = [
      row.sourceUrl,
      ...labels.map((l) => row.data[l] ?? ""),
      row.images.join(" | "),
    ];
    return cells.map(escapeCsv).join(",");
  });
  return [header, ...lines].join("\n");
}
