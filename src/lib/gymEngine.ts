import type { Exercise, LoggedExercise, SetPerformance, WorkoutExercise, WorkoutTemplateRow } from "@/types/training";

export function latestForExercise(logs: LoggedExercise[], exerciseId: string): LoggedExercise | null {
  const matches = logs.filter((log) => log.exerciseId === exerciseId);
  if (!matches.length) return null;
  return matches.sort((a, b) => {
    const dateCompare = (b.date || "").localeCompare(a.date || "");
    if (dateCompare !== 0) return dateCompare;
    return Number(b.sessionId || 0) - Number(a.sessionId || 0);
  })[0];
}

function isBodyweightExercise(exercise: Exercise): boolean {
  return exercise.equipment === "Bodyweight" || exercise.equipment === "Pull-up Bar";
}

function activeSets(last: LoggedExercise | null, exercise: Exercise): SetPerformance[] {
  const defaultKg = isBodyweightExercise(exercise) ? "0" : "";
  if (!last) return Array.from({ length: exercise.defaultSets }, () => ({ kg: defaultKg, value: null }));
  const nonEmpty = last.sets.filter((set) => set.kg || set.value !== null);
  return nonEmpty.length ? nonEmpty.map((set) => ({ ...set, kg: set.kg || (isBodyweightExercise(exercise) ? "0" : "") })) : Array.from({ length: exercise.defaultSets }, () => ({ kg: defaultKg, value: null }));
}

function increaseWeakest(values: number[], max: number): number[] {
  const next = [...values];
  let index = 0;
  for (let i = 1; i < next.length; i += 1) {
    if (next[i] < next[index]) index = i;
  }
  if (next[index] < max) next[index] += 1;
  return next;
}

export function calculateTarget(exercise: Exercise, last: LoggedExercise | null): SetPerformance[] {
  const prior = activeSets(last, exercise);
  if (!last) return prior;
  if (exercise.progressionType === "Fixed") return prior;

  const values = prior.map((set) => set.value ?? exercise.minReps ?? 0);
  const max = exercise.maxReps ?? Math.max(...values);
  const completedMax = values.length > 0 && values.every((value) => value >= max);

  if (exercise.progressionType === "Double Progression" && completedMax) {
    return prior.map((set) => {
      const numericWeight = Number(set.kg);
      const nextWeight = Number.isFinite(numericWeight)
        ? String(numericWeight + exercise.incrementKg)
        : set.kg;
      return { kg: nextWeight, value: exercise.minReps };
    });
  }

  if (exercise.progressionType === "Rep Progression" && completedMax && exercise.incrementKg > 0) {
    return prior.map((set) => {
      const numericWeight = Number(set.kg);
      return {
        kg: Number.isFinite(numericWeight) ? String(numericWeight + exercise.incrementKg) : set.kg,
        value: exercise.minReps,
      };
    });
  }

  const progressed = increaseWeakest(values, max);
  return prior.map((set, index) => ({ kg: set.kg, value: progressed[index] }));
}

export function buildWorkout(
  workoutType: string,
  variant: string,
  templates: WorkoutTemplateRow[],
  exercises: Exercise[],
  logs: LoggedExercise[],
): WorkoutExercise[] {
  const byId = new Map(exercises.map((exercise) => [exercise.exerciseId, exercise]));
  return templates
    .filter((row) => row.workoutType.trim() === workoutType.trim() && row.variant.trim() === variant.trim())
    .sort((a, b) => a.order - b.order)
    .map((row) => {
      const exercise = byId.get(row.defaultExerciseId);
      if (!exercise) throw new Error(`Template references missing exercise: ${row.defaultExerciseId}`);
      const last = latestForExercise(logs, exercise.exerciseId);
      return {
        order: row.order,
        slotName: row.slotName,
        group: row.group,
        exercise,
        last,
        target: calculateTarget(exercise, last),
      };
    });
}
