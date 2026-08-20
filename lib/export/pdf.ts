import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ScrapeRow } from "../types";

export function rowsToPdfBuffer(rows: ScrapeRow[]): Buffer {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const labels = rows.length ? Object.keys(rows[0].data) : [];
  const head = [["#", ...labels]];
  const body = rows.map((row, i) => [
    String(i + 1),
    ...labels.map((l) => {
      const v = row.data[l] ?? "";
      return v.length > 80 ? `${v.slice(0, 77)}...` : v;
    }),
  ]);

  doc.setFontSize(14);
  doc.text("Pullsheet — exportación", 40, 36);
  doc.setFontSize(9);
  doc.text(`${rows.length} filas`, 40, 52);

  autoTable(doc, {
    startY: 64,
    head,
    body,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [15, 76, 78] },
  });

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
