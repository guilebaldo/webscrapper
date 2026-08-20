import { NextResponse } from "next/server";
import { imagesToZipBuffer } from "@/lib/export/zip";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = { urls: string[] };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    if (!body.urls?.length) {
      return NextResponse.json(
        { error: "No hay URLs de imagen." },
        { status: 400 },
      );
    }

    const { buffer, saved, failed } = await imagesToZipBuffer(body.urls);
    if (!saved) {
      return NextResponse.json(
        {
          error: "No se pudo descargar ninguna imagen.",
          failed,
        },
        { status: 400 },
      );
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const headers = new Headers({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="pullsheet-images-${stamp}.zip"`,
      "X-Pullsheet-Saved": String(saved),
      "X-Pullsheet-Failed": String(failed.length),
    });

    return new NextResponse(new Uint8Array(buffer), { headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al crear ZIP";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
