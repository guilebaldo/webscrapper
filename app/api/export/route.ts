import { NextResponse } from "next/server";
import { rowsToCsv } from "@/lib/export/csv";
import { rowsToPdfBuffer } from "@/lib/export/pdf";
import { rowsToXlsxBuffer } from "@/lib/export/xlsx";
import type { ExportFormat, ScrapeRow } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  format: ExportFormat;
  rows: ScrapeRow[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    if (!body.rows?.length) {
      return NextResponse.json({ error: "No hay filas para exportar." }, { status: 400 });
    }

    const stamp = new Date().toISOString().slice(0, 10);

    if (body.format === "csv") {
      const csv = rowsToCsv(body.rows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="pullsheet-${stamp}.csv"`,
        },
      });
    }

    if (body.format === "xlsx") {
      const buf = await rowsToXlsxBuffer(body.rows);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="pullsheet-${stamp}.xlsx"`,
        },
      });
    }

    if (body.format === "pdf") {
      const buf = rowsToPdfBuffer(body.rows);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="pullsheet-${stamp}.pdf"`,
        },
      });
    }

    return NextResponse.json({ error: "Formato no soportado." }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de exportación";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
