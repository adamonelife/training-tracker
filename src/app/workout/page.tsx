"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { BuiltWorkout, Exercise, SaveWorkoutPayload, SetPerformance, WorkoutExercise } from "@/types/training";
import { cacheWorkout, getCachedWorkout, queueWorkout } from "@/lib/offline";

type EditableExercise = WorkoutExercise & { sets: SetPerformance[]; rpe: string; notes: string };
type Summary = { sessionId: string; totalSets: number; totalVolume: number; prs: string[] };

function emptySets(count: number): SetPerformance[] {
  return Array.from({ length: count }, () => ({ kg: "", value: null }));
}

function numericKg(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function targetLabel(item: EditableExercise): string {
  if (!item.last) return "NEW";
  const last = item.last.sets.filter((s) => s.kg || s.value !== null);
  const next = item.target.filter((s) => s.kg || s.value !== null);
  const weightUp = next.some((s, i) => numericKg(s.kg) > numericKg(last[i]?.kg || ""));
  const valueUp = next.some((s, i) => (s.value ?? 0) > (last[i]?.value ?? 0));
  if (weightUp) return "WEIGHT UP";
  if (valueUp) return "ADD REPS";
  return "MAINTAIN";
}

function WorkoutContent() {
  const searchParams = useSearchParams();
  const workoutType = searchParams.get("type") || "Pull";
  const variant = searchParams.get("variant") || "A";
  const [data, setData] = useState<BuiltWorkout | null>(null);
  const [items, setItems] = useState<EditableExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [offlineLoaded, setOfflineLoaded] = useState(false);
  const [queuedOffline, setQueuedOffline] = useState(false);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [rest, setRest] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [bodyweight, setBodyweight] = useState("");
  const [duration, setDuration] = useState("");
  const [calories, setCalories] = useState("");
  const [energy, setEnergy] = useState("");
  const [sleep, setSleep] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");

  useEffect(() => {
    const defaults = JSON.parse(localStorage.getItem("training-settings") || "{}");
    if (defaults.defaultEnergy) setEnergy(String(defaults.defaultEnergy));
    if (defaults.defaultSleep) setSleep(String(defaults.defaultSleep));
  }, []);

  useEffect(() => {
    if (!rest) return;
    const timer = window.setInterval(() => setRest((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [rest]);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/workouts?type=${encodeURIComponent(workoutType)}&variant=${encodeURIComponent(variant)}`);
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Unable to load workout");
        cacheWorkout(workoutType, variant, json);
        setData(json);
        setOfflineLoaded(false);
        setItems(json.exercises.map((item: WorkoutExercise) => ({ ...item, sets: item.target.map((set) => ({ ...set })), rpe: "", notes: "" })));
      } catch (err) {
        const cached = getCachedWorkout(workoutType, variant);
        if (cached) {
          setData(cached);
          setOfflineLoaded(true);
          setItems(cached.exercises.map((item: WorkoutExercise) => ({ ...item, sets: item.target.map((set) => ({ ...set })), rpe: "", notes: "" })));
        } else {
          setError(err instanceof Error ? `${err.message}. Open this workout once while online to make it available offline.` : "Unable to load workout");
        }
      } finally { setLoading(false); }
    }
    load();
  }, [workoutType, variant]);

  const activeExercises = useMemo(() => (data?.exerciseLibrary ?? []).filter((x) => x.active), [data]);
  const availableByGroup = useMemo(() => {
    const map = new Map<string, Exercise[]>();
    for (const exercise of activeExercises) map.set(exercise.group, [...(map.get(exercise.group) ?? []), exercise]);
    return map;
  }, [activeExercises]);

  function updateSet(itemIndex: number, setIndex: number, field: "kg" | "value", value: string) {
    setItems((current) => current.map((item, index) => index !== itemIndex ? item : {
      ...item,
      sets: item.sets.map((set, i) => i === setIndex ? { ...set, [field]: field === "value" ? (value === "" ? null : Number(value)) : value } : set),
    }));
  }

  function applyExercise(index: number, replacement: Exercise) {
    const snapshot = data?.exerciseSnapshots?.[replacement.exerciseId];
    const target = snapshot?.target?.length ? snapshot.target : emptySets(replacement.defaultSets);
    setItems((current) => current.map((item, i) => i === index ? { ...item, group: replacement.group, slotName: item.slotName, exercise: replacement, last: snapshot?.last ?? null, target, sets: target.map((s) => ({ ...s })), notes: "Replacement exercise" } : item));
    setReplaceIndex(null);
  }

  function addExercise(exercise: Exercise) {
    const snapshot = data?.exerciseSnapshots?.[exercise.exerciseId];
    const target = snapshot?.target?.length ? snapshot.target : emptySets(exercise.defaultSets);
    setItems((current) => [...current, { order: current.length + 1, slotName: exercise.group, group: exercise.group, exercise, last: snapshot?.last ?? null, target, sets: target.map((s) => ({ ...s })), rpe: "", notes: "Added to today's workout" }]);
    setAddOpen(false);
  }

  function removeExercise(index: number) { setItems((c) => c.filter((_, i) => i !== index).map((x, i) => ({ ...x, order: i + 1 }))); }
  function moveExercise(index: number, direction: -1 | 1) {
    setItems((current) => { const t = index + direction; if (t < 0 || t >= current.length) return current; const copy = [...current]; [copy[index], copy[t]] = [copy[t], copy[index]]; return copy.map((x, i) => ({ ...x, order: i + 1 })); });
  }

  async function saveWorkout() {
    setSaving(true); setError(""); setQueuedOffline(false);
    try {
      const prs = items.filter((item) => {
        if (!item.last) return false;
        const lastBest = Math.max(...item.last.sets.map((s) => numericKg(s.kg) * (s.value ?? 0)));
        const nowBest = Math.max(...item.sets.map((s) => numericKg(s.kg) * (s.value ?? 0)));
        return nowBest > lastBest;
      }).map((x) => x.exercise.exerciseName);
      const totalSets = items.reduce((sum, x) => sum + x.sets.filter((s) => s.kg || s.value !== null).length, 0);
      const totalVolume = items.reduce((sum, x) => sum + x.sets.reduce((s, set) => s + numericKg(set.kg) * (set.value ?? 0), 0), 0);
      const payload: SaveWorkoutPayload = {
        date, workoutType, variant,
        bodyweightKg: bodyweight ? Number(bodyweight) : null,
        durationMin: duration ? Number(duration) : null,
        watchCalories: calories ? Number(calories) : null,
        energy: energy ? Number(energy) : null,
        sleepHours: sleep ? Number(sleep) : null,
        notes: sessionNotes,
        exercises: items.map((item, index) => ({ order: index + 1, slotName: item.slotName, exerciseId: item.exercise.exerciseId, exerciseName: item.exercise.exerciseName, sets: item.sets, rpe: item.rpe ? Number(item.rpe) : null, notes: item.notes })),
      };

      if (!navigator.onLine) {
        const queued = queueWorkout(payload);
        setQueuedOffline(true);
        setSummary({ sessionId: `Offline ${queued.id.slice(0, 6)}`, totalSets, totalVolume, prs });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      try {
        const response = await fetch("/api/save-workout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Unable to save workout");
        setSummary({ sessionId: json.sessionId, totalSets, totalVolume, prs });
      } catch (networkError) {
        if (!navigator.onLine || networkError instanceof TypeError) {
          const queued = queueWorkout(payload);
          setQueuedOffline(true);
          setSummary({ sessionId: `Offline ${queued.id.slice(0, 6)}`, totalSets, totalVolume, prs });
        } else {
          throw networkError;
        }
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save workout"); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="shell"><div className="status-card">Loading {workoutType} {variant}…</div></main>;
  if (error && !data) return <main className="shell"><div className="status-card error">{error}</div></main>;

  return <main className="shell workout-shell">
    <header className="workout-header"><div><p className="eyebrow">TODAY'S WORKOUT</p><h1>{workoutType} {variant}</h1></div><a href="/" className="ghost-link">Change</a></header>

    {offlineLoaded && <div className="status-card offline-note">Offline copy loaded. Any completed workout will sync when your phone reconnects.</div>}
    {summary && <section className="summary-card">
      <p className="eyebrow">{queuedOffline ? "SAVED ON PHONE" : `SESSION ${summary.sessionId} SAVED`}</p><h2>{workoutType} {variant} complete</h2>
      <div className="summary-stats"><div><strong>{duration || "—"}</strong><span>minutes</span></div><div><strong>{calories || "—"}</strong><span>kcal</span></div><div><strong>{summary.totalSets}</strong><span>sets</span></div><div><strong>{Math.round(summary.totalVolume).toLocaleString()}</strong><span>volume kg</span></div></div>
      {queuedOffline && <p className="offline-summary">Your workout is safe and waiting to sync to Google Sheets.</p>}
      {summary.prs.length > 0 && <p className="pr-line">🏆 New best: {summary.prs.join(", ")}</p>}
    </section>}
    {error && <div className="status-card error">{error}</div>}

    <section className="session-grid panel compact">
      <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <label>Bodyweight kg<input inputMode="decimal" value={bodyweight} onChange={(e) => setBodyweight(e.target.value)} placeholder="Optional" /></label>
      <label>Energy /10<input inputMode="numeric" value={energy} onChange={(e) => setEnergy(e.target.value)} placeholder="Optional" /></label>
      <label>Sleep hours<input inputMode="decimal" value={sleep} onChange={(e) => setSleep(e.target.value)} placeholder="Optional" /></label>
    </section>

    {rest > 0 && <button className="rest-chip" onClick={() => setRest(0)}>Rest {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")} · tap to stop</button>}

    <section className="exercise-list">
      {items.map((item, index) => {
        const unit = item.exercise.trackingType === "Reps" ? "Reps" : item.exercise.trackingType;
        const badge = targetLabel(item);
        return <article className="exercise-card" key={`${item.exercise.exerciseId}-${index}`}>
          <div className="exercise-topline"><div><span className="order-badge">{index + 1}</span><p className="slot">{item.slotName}</p><h2>{item.exercise.exerciseName}</h2><p className="muted small">{item.exercise.group} · {item.exercise.equipment}</p></div><div className="move-controls"><button onClick={() => moveExercise(index, -1)}>↑</button><button onClick={() => moveExercise(index, 1)}>↓</button><button className="danger-text" onClick={() => removeExercise(index)}>×</button></div></div>
          <div className={`progression-badge ${badge.toLowerCase().replace(" ", "-")}`}>{badge}</div>
          {item.last ? <div className="last-performance"><strong>Previous</strong>{item.last.sets.filter((s) => s.kg || s.value !== null).map((s, i) => <span key={i}>{s.kg || "—"} × {s.value ?? "—"}</span>)}</div> : <div className="last-performance new">No previous data</div>}
          <div className="sets-header"><span>Set</span><span>KG</span><span>{unit}</span></div>
          <div className="sets-grid">{item.sets.map((set, setIndex) => <div className="set-row" key={setIndex}><strong>{setIndex + 1}</strong><input inputMode="decimal" value={set.kg} onChange={(e) => updateSet(index, setIndex, "kg", e.target.value)} placeholder={item.exercise.equipment === "Bodyweight" || item.exercise.equipment === "Pull-up Bar" ? "BW" : "kg"}/><input inputMode="numeric" value={set.value ?? ""} onChange={(e) => updateSet(index, setIndex, "value", e.target.value)} placeholder={unit.toLowerCase()}/></div>)}</div>
          <div className="quick-actions"><button onClick={() => setRest(90)}>90s rest</button><button onClick={() => setRest(120)}>2m rest</button><button onClick={() => setReplaceIndex(index)}>Replace</button></div>
          <details><summary>RPE & notes</summary><div className="exercise-meta"><label>RPE<input inputMode="decimal" value={item.rpe} onChange={(e) => setItems((c) => c.map((x, i) => i === index ? { ...x, rpe: e.target.value } : x))} placeholder="Optional" /></label><label>Notes<input value={item.notes} onChange={(e) => setItems((c) => c.map((x, i) => i === index ? { ...x, notes: e.target.value } : x))} placeholder="Optional" /></label></div></details>
        </article>;
      })}
    </section>

    <button className="secondary full" onClick={() => setAddOpen(true)}>+ Add exercise</button>
    <section className="panel finish-panel"><h2>Finish workout</h2><div className="session-grid"><label>Duration min<input inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} /></label><label>Watch calories<input inputMode="numeric" value={calories} onChange={(e) => setCalories(e.target.value)} /></label></div><label className="label-block">Session notes<textarea value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} rows={3} placeholder="Optional" /></label><button className="primary big" disabled={saving} onClick={saveWorkout}>{saving ? "Saving…" : "Finish & save"}</button></section>

    {(replaceIndex !== null || addOpen) && <div className="modal-backdrop" onClick={() => { setReplaceIndex(null); setAddOpen(false); }}><section className="modal" onClick={(e) => e.stopPropagation()}><div className="modal-head"><h2>{addOpen ? "Add exercise" : `Replace ${items[replaceIndex!]?.exercise.exerciseName}`}</h2><button onClick={() => { setReplaceIndex(null); setAddOpen(false); }}>×</button></div><div className="choice-list">{(addOpen ? activeExercises : (availableByGroup.get(items[replaceIndex!]?.group) ?? [])).map((exercise) => <button key={exercise.exerciseId} onClick={() => addOpen ? addExercise(exercise) : applyExercise(replaceIndex!, exercise)}><strong>{exercise.exerciseName}</strong><span>{exercise.group} · {exercise.equipment}</span></button>)}</div></section></div>}
  </main>;
}

export default function WorkoutPage() { return <Suspense fallback={<main className="shell"><div className="status-card">Loading…</div></main>}><WorkoutContent /></Suspense>; }
