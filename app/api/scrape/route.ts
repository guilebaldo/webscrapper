import { NextResponse } from "next/server";
import { runScrape } from "@/lib/scrape/run";
import type { ScrapeRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ScrapeRequest;
    const result = await runScrape(body);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de scrape";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
