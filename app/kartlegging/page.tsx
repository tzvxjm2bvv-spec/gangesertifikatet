"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

type Task = { a: number; b: number };
type TaskResult = {
  a: number;
  b: number;
  correctAnswer: number;
  userAnswer: number | null;
  correct: boolean;
  ms: number;
  ts: number;
};

export default function KartleggingPage() {
  // Lag alle oppgaver 0–10, bland rekkefølgen
  const tasks = useMemo(() => {
    const t: Task[] = [];
    for (let a = 0; a <= 10; a++) {
  for (let b = 0; b <= 10; b++) t.push({ a, b });
}
    return t.sort(() => Math.random() - 0.5);
  }, []);

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<TaskResult[]>([]);
  const startedAtRef = useRef<number>(performance.now());

  const task = tasks[index];

  function submit() {
    if (!task) return;
    const now = performance.now();
    const user = answer.trim() === "" ? null : Number(answer);
    const correctAnswer = task.a * task.b;
    const correct = user === correctAnswer;

    setResults((r) => [
      ...r,
      {
        a: task.a,
        b: task.b,
        correctAnswer,
        userAnswer: user,
        correct,
        ms: now - startedAtRef.current,
        ts: Date.now(),
      },
    ]);

    // Restart "klokke" for neste oppgave
    startedAtRef.current = performance.now();

    setAnswer("");
    setIndex((i) => i + 1);
  }

  // Ferdig
  if (!task) {
    return (
      <main style={{ padding: 18, maxWidth: 520 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          ← Tilbake
        </Link>

        <h1 style={{ marginTop: 12 }}>Kartlegging ferdig</h1>
        <p>Antall oppgaver: {results.length}</p>

        <div style={{ marginTop: 14, padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}>
          <strong>Neste steg:</strong> Vi bruker dette til å foreslå hvilke tabeller som bør øves mest på.
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: 18, maxWidth: 420 }}>
      <Link href="/" style={{ textDecoration: "none" }}>
        ← Tilbake
      </Link>

      <h1 style={{ marginTop: 12 }}>Kartlegging</h1>
      <p style={{ opacity: 0.7 }}>
        Oppgave {index + 1} av {tasks.length}
      </p>

      <div style={{ fontSize: 34, margin: "18px 0", fontWeight: 800 }}>
        {task.a} × {task.b}
      </div>

      <input
        autoFocus
        inputMode="numeric"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Svar"
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.18)",
          fontSize: 18,
          outline: "none",
        }}
      />

      <button
        onClick={submit}
        style={{
          marginTop: 12,
          width: "100%",
          padding: "12px 14px",
          borderRadius: 12,
          border: "none",
          background: "#111",
          color: "white",
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Neste
      </button>
    </main>
  );
}
