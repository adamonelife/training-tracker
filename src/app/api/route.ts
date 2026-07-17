import { NextRequest, NextResponse } from "next/server";
import { appendRows, readSheet, sheetName } from "@/lib/googleSheets";
import type { SaveWorkoutPayload } from "@/types/training";

export const runtime = "nodejs";

function safeNumber(value: number | null | undefined): number | string {
  return value ?? "";
}

async function nextSessionId(): Promise<string> {
  const rows = await readSheet(`${sheetName("SHEET_SESSIONS", "Sessions")}!A:A`);
  const ids = rows.slice(1).map((row) => Number(row[0])).filter(Number.isFinite);
  return String((ids.length ? Math.max(...ids) : 0) + 1);
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as SaveWorkoutPayload;
    if (!payload.workoutType || !payload.variant || !payload.date || !payload.exercises?.length) {
      return NextResponse.json({ error: "Missing workout details" }, { status: 400 });
    }

    const sessionId = await nextSessionId();
    const sessionsTab = sheetName("SHEET_SESSIONS", "Sessions");
    const logTab = sheetName("SHEET_LOG", "Workout Log");

    await appendRows(`${sessionsTab}!A:L`, [[
      sessionId,
      payload.date,
      payload.workoutType,
      payload.variant,
      safeNumber(payload.bodyweightKg),
      safeNumber(payload.durationMin),
      safeNumber(payload.watchCalories),
      safeNumber(payload.energy),
      safeNumber(payload.sleepHours),
      payload.notes || "",
    ]]);

    const logRows = payload.exercises.map((exercise) => {
      const sets = [...exercise.sets, ...Array.from({ length: 4 }, () => ({ kg: "", value: null }))].slice(0, 4);
      return [
        sessionId,
        payload.date,
        payload.workoutType,
        payload.variant,
        exercise.order,
        exercise.slotName,
        exercise.exerciseId,
        exercise.exerciseName,
        sets[0].kg,
        safeNumber(sets[0].value),
        sets[1].kg,
        safeNumber(sets[1].value),
        sets[2].kg,
        safeNumber(sets[2].value),
        sets[3].kg,
        safeNumber(sets[3].value),
        safeNumber(exercise.rpe),
        exercise.notes || "",
      ];
    });

    await appendRows(`${logTab}!A:R`, logRows);
    return NextResponse.json({ ok: true, sessionId });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save workout" },
      { status: 500 },
    );
  }
}
