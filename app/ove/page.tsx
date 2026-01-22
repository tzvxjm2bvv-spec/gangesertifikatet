"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Task = { a: number; b: number };

type Result = {
  task: Task;
  ms: number;
  correct: boolean;
};

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function fmtMs(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`;
}

function parseTables(param: string | null): number[] {
  if (!param) return [];
  return param
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => n >= 2 && n <= 9);
}

export default function OvePage() {
  const searchParams = useSearchParams();
  const selectedTables = useMemo(
    () => parseTables(searchParams.get("tables")),
    [searchParams]
  );

  // fallback hvis ingen anbefalinger
  const tables = selectedTables.length
    ? selectedTables
    : [2, 3, 4, 5, 6, 7, 8, 9];

  // generer oppgaver
  const tasks = useMemo(() => {
    const t: Task[] = [];
    for (const a of tables) {
      for (let b = 2; b <= 9; b++) t.push({ a, b });
    }
    return shuffle(t);
  }, [tables]);

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [done, setDone] = useState(false);

  const startedAtRef = useRef<number>(
    typeof performance !== "undefined" ? performance.now() : Date.now()
  );

  const task = tasks[index];

  function submit() {
    if (!task || done) return;

    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const ms = Math.max(0, now - startedAtRef.current);

    const user = Number(answer.trim());
    const correct = user === task.a * task.b;

    setResults((r) => [...r, { task, ms, correct }]);

    setAnswer("");
    startedAtRef.current =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    if (index + 1 >= tasks.length) {
      setDone(true);
      return;
    }

    setIndex((i) => i + 1);
  }

  // ---------- FERDIG ----------
  if (done) {
    const totalMs = results.reduce((a, r) => a + r.ms, 0);

    const slowest = [...results]
      .sort((a, b) => b.ms - a.ms)
      .slice(0, 5);

    return (
      <main style={{ padding: 18, maxWidth: 720 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          ← Tilbake
        </Link>

        <h1 style={{ marginTop: 12 }}>Øving ferdig</h1>

        <p style={{ opacity: 0.8 }}>
          Øvde på:{" "}
          <strong>{tables.map((t) => `${t}-gangen`).join(", ")}</strong>
        </p>

        <div
          style={{
            marginTop: 12,
            padding: 14,
            borderRadius: 14,
            background: "rgba(0,0,0,0.25)",
            color: "white",
          }}
        >
          <p>
            <strong>{results.length}</strong> oppgaver
          </p>
          <p>
            Total tid: <strong>{fmtMs(totalMs)}</strong>
          </p>
        </div>

        <h3 style={{ marginTop: 18 }}>Tregeste oppgaver</h3>
        <ul>
          {slowest.map((r, i) => (
            <li key={i}>
              {r.task.a} × {r.task.b} – {fmtMs(r.ms)}{" "}
              {!r.correct && "(feil)"}
            </li>
          ))}
        </ul>

        <button
          onClick={() => {
            setIndex(0);
            setResults([]);
            setDone(false);
          }}
          style={{
            marginTop: 18,
            padding: "12px 14px",
            borderRadius: 12,
            border: "none",
            background: "#111",
            color: "white",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Øv mer
        </button>
      </main>
    );
  }

  // ---------- PÅGÅENDE ----------
  if (!task) return null;

  return (
    <main style={{ padding: 18, maxWidth: 520 }}>
      <Link href="/" style={{ textDecoration: "none" }}>
        ← Tilbake
      </Link>

      <h1 style={{ marginTop: 12 }}>Øve</h1>
      <p style={{ opacity: 0.75 }}>
        Oppgave {index + 1} av {tasks.length}
      </p>

      <div style={{ fontSize: 38, fontWeight: 900, margin: "18px 0" }}>
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
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        Neste
      </button>

      <p style={{ marginTop: 12, opacity: 0.6, fontSize: 12 }}>
        Ingen tidsgrense – dette er bare øving 💙
      </p>
    </main>
  );
}
