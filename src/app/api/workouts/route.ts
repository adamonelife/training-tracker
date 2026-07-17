import { NextRequest, NextResponse } from "next/server";
import { readSheet, sheetName } from "@/lib/googleSheets";
import { parseExercises, parseLog, parseTemplates } from "@/lib/parsers";
import { buildWorkout, calculateTarget, latestForExercise } from "@/lib/gymEngine";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const workoutType = request.nextUrl.searchParams.get("type") || "Pull";
    const variant = request.nextUrl.searchParams.get("variant") || "A";

    const [exerciseRows, templateRows, logRows] = await Promise.all([
      readSheet(`${sheetName("SHEET_EXERCISES", "Exercise Library")}!A:Z`),
      readSheet(`${sheetName("SHEET_TEMPLATES", "Workout Templates")}!A:Z`),
      readSheet(`${sheetName("SHEET_LOG", "Workout Log")}!A:Z`),
    ]);

    const exercises = parseExercises(exerciseRows).filter((exercise) => exercise.active);
    const templates = parseTemplates(templateRows);
    const logs = parseLog(logRows);
    const workout = buildWorkout(workoutType, variant, templates, exercises, logs);
    const exerciseSnapshots = Object.fromEntries(exercises.map((exercise) => {
      const last = latestForExercise(logs, exercise.exerciseId);
      return [exercise.exerciseId, { last, target: calculateTarget(exercise, last) }];
    }));

    return NextResponse.json({ workoutType, variant, exercises: workout, exerciseLibrary: exercises, exerciseSnapshots });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load workout" },
      { status: 500 },
    );
  }
}
