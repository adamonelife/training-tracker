"use client";

import type { BuiltWorkout, SaveWorkoutPayload } from "@/types/training";

const WORKOUT_CACHE_PREFIX = "training-workout-cache:";
const PENDING_KEY = "training-pending-workouts";

export type PendingWorkout = {
  id: string;
  queuedAt: string;
  payload: SaveWorkoutPayload;
};

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function workoutCacheKey(type: string, variant: string): string {
  return `${WORKOUT_CACHE_PREFIX}${type}:${variant}`;
}

export function cacheWorkout(type: string, variant: string, workout: BuiltWorkout): void {
  localStorage.setItem(workoutCacheKey(type, variant), JSON.stringify({ cachedAt: new Date().toISOString(), workout }));
}

export function getCachedWorkout(type: string, variant: string): BuiltWorkout | null {
  const record = safeParse<{ workout?: BuiltWorkout } | null>(localStorage.getItem(workoutCacheKey(type, variant)), null);
  return record?.workout ?? null;
}

export function getPendingWorkouts(): PendingWorkout[] {
  return safeParse<PendingWorkout[]>(localStorage.getItem(PENDING_KEY), []);
}

function setPendingWorkouts(items: PendingWorkout[]): void {
  localStorage.setItem(PENDING_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("training-sync-state", { detail: { pending: items.length } }));
}

export function queueWorkout(payload: SaveWorkoutPayload): PendingWorkout {
  const item: PendingWorkout = {
    id: crypto.randomUUID(),
    queuedAt: new Date().toISOString(),
    payload,
  };
  setPendingWorkouts([...getPendingWorkouts(), item]);
  return item;
}

export async function syncPendingWorkouts(): Promise<{ synced: number; remaining: number }> {
  const pending = getPendingWorkouts();
  if (!pending.length || !navigator.onLine) return { synced: 0, remaining: pending.length };

  const remaining: PendingWorkout[] = [];
  let synced = 0;

  for (const item of pending) {
    try {
      const response = await fetch("/api/save-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });
      if (!response.ok) {
        remaining.push(item);
        continue;
      }
      synced += 1;
    } catch {
      remaining.push(item);
    }
  }

  setPendingWorkouts(remaining);
  return { synced, remaining: remaining.length };
}
