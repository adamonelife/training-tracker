"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const workoutTypes = ["Push", "Pull", "Leg"];
const variants = ["A", "B"];

export default function HomePage() {
  const router = useRouter();
  const [type, setType] = useState("Pull");
  const [variant, setVariant] = useState("A");

  return (
    <main className="shell home-shell">
      <section className="hero">
        <p className="eyebrow">TRAINING TRACKER</p>
        <h1>What are we training?</h1>
        <p className="muted">Load your template, previous performance and next targets.</p>
      </section>

      <section className="panel">
        <label className="label">Workout type</label>
        <div className="segmented three">
          {workoutTypes.map((item) => (
            <button key={item} className={type === item ? "active" : ""} onClick={() => setType(item)}>
              {item}
            </button>
          ))}
        </div>

        <label className="label top-gap">Variant</label>
        <div className="segmented">
          {variants.map((item) => (
            <button key={item} className={variant === item ? "active" : ""} onClick={() => setVariant(item)}>
              {item}
            </button>
          ))}
        </div>

        <button className="primary big" onClick={() => router.push(`/workout?type=${type}&variant=${variant}`)}>
          Build {type} {variant}
        </button>
      </section>
      <div className="home-links"><a href="/settings">Settings</a></div>
    </main>
  );
}
