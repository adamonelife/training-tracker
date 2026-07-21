import { NextRequest, NextResponse } from "next/server";
import { appendRows, readSheet, sheetName } from "@/lib/googleSheets";
import type { CardioEntry } from "@/types/training";

export const runtime = "nodejs";

function numberOrBlank(value: number | null | undefined): number | string {
  return value ?? "";
}

async function nextCardioId(): Promise<string> {
  const tab = sheetName("SHEET_CARDIO", "Cardio Log");
  const rows = await readSheet(`${tab}!A:A`);
  const ids = rows.slice(1).map((row) => Number(String(row[0] || "").replace(/\D/g, ""))).filter(Number.isFinite);
  return `C${String((ids.length ? Math.max(...ids) : 0) + 1).padStart(4, "0")}`;
}

export async function GET() {
  try {
    const tab = sheetName("SHEET_CARDIO", "Cardio Log");
    const rows = await readSheet(`${tab}!A:H`);
    const entries = rows.slice(1).filter((r) => r.some(Boolean)).map((r) => ({
      cardioId: r[0] || "",
      date: r[1] || "",
      activity: r[2] || "",
      durationMin: Number(r[3] || 0),
      watchCalories: Number(r[4] || 0),
      distanceKm: r[5] ? Number(r[5]) : null,
      averageHr: r[6] ? Number(r[6]) : null,
      notes: r[7] || "",
    }));
    return NextResponse.json({ entries });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load cardio" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as CardioEntry;
    if (!payload.date || !payload.activity || !payload.durationMin || !payload.watchCalories) {
      return NextResponse.json({ error: "Date, activity, duration and calories are required" }, { status: 400 });
    }
    const cardioId = await nextCardioId();
    const tab = sheetName("SHEET_CARDIO", "Cardio Log");
    await appendRows(`${tab}!A:H`, [[
      cardioId,
      payload.date,
      payload.activity,
      payload.durationMin,
      payload.watchCalories,
      numberOrBlank(payload.distanceKm),
      numberOrBlank(payload.averageHr),
      payload.notes || "",
    ]]);
    return NextResponse.json({ ok: true, cardioId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save cardio" }, { status: 500 });
  }
}
