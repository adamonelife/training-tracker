"use client";
import { useEffect, useState } from "react";
export default function SettingsPage() {
  const [energy, setEnergy] = useState("");
  const [sleep, setSleep] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const settings = JSON.parse(localStorage.getItem("training-settings") || "{}");
    setEnergy(settings.defaultEnergy || "");
    setSleep(settings.defaultSleep || "");
  }, []);
  function save() {
    localStorage.setItem("training-settings", JSON.stringify({ defaultEnergy: energy, defaultSleep: sleep }));
    setSaved(true);
  }
  return <main className="shell">
    <header className="workout-header"><div><p className="eyebrow">SETTINGS</p><h1>Defaults</h1></div><a href="/" className="ghost-link">Home</a></header>
    <section className="panel">
      <label className="label-block">Default energy /10<input inputMode="numeric" value={energy} onChange={(e) => setEnergy(e.target.value)} placeholder="Leave blank" /></label>
      <label className="label-block">Default sleep hours<input inputMode="decimal" value={sleep} onChange={(e) => setSleep(e.target.value)} placeholder="Leave blank" /></label>
      <button className="primary big" onClick={save}>Save settings</button>
      {saved && <p className="success-text">Saved on this device.</p>}
    </section>
  </main>;
}
