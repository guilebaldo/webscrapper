import ExcelJS from "exceljs";
import type { ScrapeRow } from "../types";

export async function rowsToXlsxBuffer(rows: ScrapeRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Pullsheet";
  const sheet = workbook.addWorksheet("Datos");

  const labels = rows.length ? Object.keys(rows[0].data) : [];
  sheet.columns = [
    { header: "sourceUrl", key: "sourceUrl", width: 40 },
    ...labels.map((l) => ({ header: l, key: l, width: 24 })),
    { header: "images", key: "images", width: 48 },
  ];

  for (const row of rows) {
    sheet.addRow({
      sourceUrl: row.sourceUrl,
      ...row.data,
      images: row.images.join(" | "),
    });
  }

  sheet.getRow(1).font = { bold: true };
  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
