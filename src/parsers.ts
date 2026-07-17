import type { Exercise, LoggedExercise, ProgressionType, TrackingType, WorkoutTemplateRow } from "@/types/training";

function key(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map(key);
  return rows.slice(1).filter((row) => row.some(Boolean)).map((row) => {
    const out: Record<string, string> = {};
    headers.forEach((header, index) => { out[header] = row[index]?.trim() ?? ""; });
    return out;
  });
}

function num(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function yes(value: string): boolean {
  return ["yes", "true", "1", "y"].includes(value.trim().toLowerCase());
}

export function parseExercises(rows: string[][]): Exercise[] {
  return rowsToObjects(rows).map((r) => ({
    exerciseId: r.exerciseid,
    exerciseName: r.exercisename,
    group: r.group,
    equipment: r.equipment,
    defaultSets: num(r.defaultsets) ?? 0,
    minReps: num(r.minreps),
    maxReps: num(r.maxreps),
    incrementKg: num(r.incrementkg) ?? 0,
    progressionType: (r.progressiontype || "Fixed") as ProgressionType,
    active: yes(r.active),
    trackingType: (r.trackingtype || "Reps") as TrackingType,
  })).filter((exercise) => exercise.exerciseId);
}

export function parseTemplates(rows: string[][]): WorkoutTemplateRow[] {
  return rowsToObjects(rows).map((r) => ({
    workoutType: r.workouttype,
    variant: r.variant,
    order: num(r.order) ?? 0,
    slotName: r.slotname,
    group: r.group,
    defaultExerciseId: r.defaultexerciseid,
    required: yes(r.required),
  })).filter((row) => row.defaultExerciseId);
}

export function parseLog(rows: string[][]): LoggedExercise[] {
  return rowsToObjects(rows).map((r) => ({
    sessionId: r.sessionid,
    date: r.date,
    workoutType: r.workouttype,
    variant: r.variant,
    order: num(r.order),
    slotName: r.slotname,
    exerciseId: r.exerciseid,
    exerciseName: r.exercisename,
    sets: [1, 2, 3, 4].map((set) => ({
      kg: r[`set${set}kg`] || "",
      value: num(r[`set${set}reps`]),
    })),
    rpe: num(r.rpe),
    notes: r.notes || "",
  })).filter((row) => row.exerciseId);
}
