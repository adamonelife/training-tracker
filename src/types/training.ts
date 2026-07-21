export type TrackingType = "Reps" | "Seconds" | "Minutes" | "Distance";
export type ProgressionType = "Double Progression" | "Rep Progression" | "Fixed";

export interface Exercise {
  exerciseId: string;
  exerciseName: string;
  group: string;
  equipment: string;
  defaultSets: number;
  minReps: number | null;
  maxReps: number | null;
  incrementKg: number;
  progressionType: ProgressionType;
  active: boolean;
  trackingType: TrackingType;
}

export interface WorkoutTemplateRow {
  workoutType: string;
  variant: string;
  order: number;
  slotName: string;
  group: string;
  defaultExerciseId: string;
  required: boolean;
}

export interface SetPerformance {
  kg: string;
  value: number | null;
}

export interface LoggedExercise {
  sessionId: string;
  date: string;
  workoutType: string;
  variant: string;
  order: number | null;
  slotName: string;
  exerciseId: string;
  exerciseName: string;
  sets: SetPerformance[];
  rpe: number | null;
  notes: string;
}

export interface WorkoutExercise {
  order: number;
  slotName: string;
  group: string;
  exercise: Exercise;
  last: LoggedExercise | null;
  target: SetPerformance[];
}

export interface BuiltWorkout {
  workoutType: string;
  variant: string;
  exercises: WorkoutExercise[];
  exerciseLibrary: Exercise[];
  exerciseSnapshots?: Record<string, { last: LoggedExercise | null; target: SetPerformance[] }>;
}

export interface SaveWorkoutPayload {
  date: string;
  workoutType: string;
  variant: string;
  bodyweightKg?: number | null;
  durationMin?: number | null;
  watchCalories?: number | null;
  energy?: number | null;
  sleepHours?: number | null;
  notes?: string;
  exercises: Array<{
    order: number;
    slotName: string;
    exerciseId: string;
    exerciseName: string;
    sets: SetPerformance[];
    rpe?: number | null;
    notes?: string;
  }>;
}

export interface CardioEntry {
  cardioId?: string;
  date: string;
  activity: string;
  durationMin: number;
  watchCalories: number;
  distanceKm?: number | null;
  averageHr?: number | null;
  notes?: string;
}
