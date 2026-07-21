"use client";

import { useEffect, useMemo, useState } from "react";
import type { CardioEntry } from "@/types/training";

const activities = ["Padel", "Cycling", "Walking", "Running", "Other"];

function weekStart(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function CardioPage() {
  const [entries, setEntries] = useState<CardioEntry[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [activity, setActivity] = useState("Padel");
  const [durationMin, setDurationMin] = useState("");
  const [watchCalories, setWatchCalories] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [averageHr, setAverageHr] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/cardio");
    const json = await response.json();
    if (response.ok) setEntries(json.entries || []);
  }

  useEffect(() => { void load(); }, []);

  const weekly = useMemo(() => {
    const start = weekStart(new Date());
    const end = new Date(start); end.setDate(end.getDate() + 7);
    const current = entries.filter((entry) => {
      const d = new Date(`${entry.date}T00:00:00`);
      return d >= start && d < end;
    });
    return {
      sessions: current.length,
      minutes: current.reduce((sum, x) => sum + Number(x.durationMin || 0), 0),
      calories: current.reduce((sum, x) => sum + Number(x.watchCalories || 0), 0),
    };
  }, [entries]);

  async function save() {
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/cardio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date, activity,
          durationMin: Number(durationMin),
          watchCalories: Number(watchCalories),
          distanceKm: distanceKm ? Number(distanceKm) : null,
          averageHr: averageHr ? Number(averageHr) : null,
          notes,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Unable to save cardio");
      setMessage(`${activity} saved`);
      setDurationMin(""); setWatchCalories(""); setDistanceKm(""); setAverageHr(""); setNotes("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save cardio");
    } finally { setSaving(false); }
  }

  return <main className="shell">
    <header className="workout-header"><div><p className="eyebrow">CARDIO TRACKER</p><h1>Log cardio</h1></div><a href="/" className="ghost-link">Home</a></header>
    <section className="summary-card cardio-summary"><p className="eyebrow">THIS WEEK</p><div className="summary-stats"><div><strong>{weekly.sessions}</strong><span>sessions</span></div><div><strong>{weekly.minutes}</strong><span>minutes</span></div><div><strong>{weekly.calories.toLocaleString()}</strong><span>kcal</span></div></div></section>
    <section className="panel cardio-form">
      <div className="session-grid"><label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><label>Activity<select value={activity} onChange={(e) => setActivity(e.target.value)}>{activities.map((x) => <option key={x}>{x}</option>)}</select></label></div>
      <div className="session-grid top-gap"><label>Duration min<input inputMode="numeric" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} /></label><label>Watch calories<input inputMode="numeric" value={watchCalories} onChange={(e) => setWatchCalories(e.target.value)} /></label></div>
      <details><summary>Optional details</summary><div className="session-grid top-gap"><label>Distance km<input inputMode="decimal" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} /></label><label>Average HR<input inputMode="numeric" value={averageHr} onChange={(e) => setAverageHr(e.target.value)} /></label></div><label className="label-block">Notes<textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></label></details>
      {message && <p className={message.endsWith("saved") ? "success-text" : "danger-text"}>{message}</p>}
      <button className="primary big" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save cardio"}</button>
    </section>
  </main>;
}
