"use client";

import Link from "next/link";
import React, { useMemo, useRef, useState } from "react";

type Task = { a: number; b: number };

type TaskResult = {
  task: { a: number; b: number };
  userAnswer: number | null;
  correctAnswer: number;
  correct: boolean;
  ms: number; // tid brukt på denne oppgaven
  ts: number; // timestamp
};

type TableStat = {
  table: number; // a-verdien (2..9)
  n: number;
  correctN: number;
  wrongN: number;
  accuracy: number; // 0..1
  medianMs: number;
  meanMs: number;
  score: number; // brukes til anbefaling
};

function median(nums: number[]) {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function mean(nums: number[]) {
  if (nums.length === 0) return 0;
  return nums.reduce((acc, x) => acc + x, 0) / nums.length;
}

function fmtMs(ms: number) {
  if (!isFinite(ms) || ms <= 0) return "0.0s";
  return `${(ms / 1000).toFixed(1)}s`;
}

function taskKey(t: { a: number; b: number }) {
  return `${t.a}×${t.b}`;
}

function analyze(results: TaskResult[]) {
  const allTimes = results.map((r) => r.ms).filter((x) => Number.isFinite(x) && x > 0);
  const globalMedian = median(allTimes) || 1;

  // --- Per tabell (a-gangen)
  const byTable = new Map<number, TaskResult[]>();
  for (const r of results) {
    const table = r.task.a;
    if (!byTable.has(table)) byTable.set(table, []);
    byTable.get(table)!.push(r);
  }

  const tableStats: TableStat[] = [];
  for (const [table, rs] of byTable.entries()) {
    const times = rs.map((r) => r.ms);
    const correctN = rs.filter((r) => r.correct).length;
    const wrongN = rs.length - correctN;
    const acc = rs.length ? correctN / rs.length : 0;

    const med = median(times);
    const avg = mean(times);

    // Score: kombiner treghet og feil
    // - treghet relativt til barnets egen median (med/globalMedian)
    // - feil: (1-accuracy) vektes litt mer enn tid
    const timeRel = med / globalMedian; // >1 betyr tregere enn egen median
    const error = 1 - acc;

    const score = timeRel + error * 1.4;

    tableStats.push({
      table,
      n: rs.length,
      correctN,
      wrongN,
      accuracy: acc,
      medianMs: med,
      meanMs: avg,
      score,
    });
  }

  // Sorter “anbefalt å øve mest” først
  const recommendedTables = [...tableStats]
    .sort((a, b) => b.score - a.score)
    .map((s) => s.table);

  // --- Tregeste enkeltoppgaver relativt til egen median
  // Vi bruker ratio = ms / globalMedian, og viser topp 8.
  const slowTasks = [...results]
    .map((r) => ({
      key: taskKey(r.task),
      a: r.task.a,
      b: r.task.b,
      ms: r.ms,
      ratio: r.ms / globalMedian,
      correct: r.correct,
      userAnswer: r.userAnswer,
      correctAnswer: r.correctAnswer,
    }))
    .sort((x, y) => y.ratio - x.ratio)
    .slice(0, 8);

  // --- Svakeste (mest feil) tabeller
  const weakestByErrors = [...tableStats]
    .sort((a, b) => b.wrongN - a.wrongN || a.accuracy - b.accuracy)
    .map((s) => s.table);

  // --- Tregeste tabeller (median)
  const slowestByTime = [...tableStats].sort((a, b) => b.medianMs - a.medianMs).map((s) => s.table);

  return {
    globalMedian,
    tableStats: tableStats.sort((a, b) => b.score - a.score),
    recommendedTables,
    weakestByErrors,
    slowestByTime,
    slowTasks,
  };
}

export default function KartleggingPage() {
  // 2–9-gangen, alle kombinasjoner = 8×8=64
  const tasks = useMemo(() => {
    const t: Task[] = [];
    for (let a = 2; a <= 9; a++) {
      for (let b = 2; b <= 9; b++) t.push({ a, b });
    }
    return t.sort(() => Math.random() - 0.5);
  }, []);

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<TaskResult[]>([]);
  const [done, setDone] = useState(false);
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyze> | null>(null);

  // Måler tid per oppgave
  const startedAtRef = useRef<number>(typeof performance !== "undefined" ? performance.now() : Date.now());

  const task = tasks[index];

  function submit() {
    if (!task || done) return;

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const ms = Math.max(0, now - startedAtRef.current);

    const trimmed = answer.trim();
    const user = trimmed === "" ? null : Number(trimmed);
    const correctAnswer = task.a * task.b;
    const correct = user === correctAnswer;

    const nextResults: TaskResult[] = [
      ...results,
      {
        task: { a: task.a, b: task.b },
        userAnswer: user,
        correctAnswer,
        correct,
        ms,
        ts: Date.now(),
      },
    ];

    // Restart klokke for neste oppgave
    startedAtRef.current = typeof performance !== "undefined" ? performance.now() : Date.now();

    // Neste
    setAnswer("");

    const nextIndex = index + 1;
    if (nextIndex >= tasks.length) {
      const a = analyze(nextResults);
      setResults(nextResults);
      setAnalysis(a);
      setDone(true);
      return;
    }

    setResults(nextResults);
    setIndex(nextIndex);
  }

  // UI: ferdig
  if (done && analysis) {
    const top2 = analysis.recommendedTables.slice(0, 2);
    const top3 = analysis.recommendedTables.slice(0, 3);

    return (
      <main style={{ padding: 18, maxWidth: 720 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          ← Tilbake
        </Link>

        <h1 style={{ marginTop: 12 }}>Kartlegging ferdig</h1>
        <p style={{ opacity: 0.75 }}>
          2–9-gangen · {results.length} oppgaver · median svartid: <strong>{fmtMs(analysis.globalMedian)}</strong>
        </p>

        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(0,0,0,0.25)",
            color: "white",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>Anbefalt øving</h2>
          <p style={{ margin: "8px 0 0 0", opacity: 0.9 }}>
            Øv mest på:{" "}
            <strong>
              {top2.map((t) => `${t}-gangen`).join(" og ")}
            </strong>
            {top3.length > 2 ? ` (deretter ${top3[2]}-gangen)` : ""}.
          </p>
          <p style={{ margin: "8px 0 0 0", opacity: 0.8, fontSize: 13 }}>
            (Dette baseres på både feil og treghet – også når svaret er riktig.)
          </p>
        </div>

        <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
          <section
            style={{
              padding: 14,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.18)",
              color: "white",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Tabeller (rangert)</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: "left", opacity: 0.8 }}>
                    <th style={{ padding: "8px 6px" }}>Tabell</th>
                    <th style={{ padding: "8px 6px" }}>Riktig</th>
                    <th style={{ padding: "8px 6px" }}>Feil</th>
                    <th style={{ padding: "8px 6px" }}>Median tid</th>
                    <th style={{ padding: "8px 6px" }}>Snitt tid</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.tableStats.map((s) => (
                    <tr key={s.table} style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
                      <td style={{ padding: "8px 6px", fontWeight: 800 }}>{s.table}-gangen</td>
                      <td style={{ padding: "8px 6px" }}>{s.correctN}/{s.n}</td>
                      <td style={{ padding: "8px 6px" }}>{s.wrongN}</td>
                      <td style={{ padding: "8px 6px" }}>{fmtMs(s.medianMs)}</td>
                      <td style={{ padding: "8px 6px" }}>{fmtMs(s.meanMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
              Tregeste (median): <strong>{analysis.slowestByTime.slice(0, 3).map((t) => `${t}-gangen`).join(", ")}</strong>
              <br />
              Mest feil: <strong>{analysis.weakestByErrors.slice(0, 3).map((t) => `${t}-gangen`).join(", ")}</strong>
            </p>
          </section>

          <section
            style={{
              padding: 14,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.18)",
              color: "white",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Tregeste enkeltoppgaver (relativt)</h3>
            <p style={{ marginTop: -6, opacity: 0.75, fontSize: 13 }}>
              Dette er oppgaver som tok uforholdsmessig lang tid sammenlignet med barnets egen median ({fmtMs(analysis.globalMedian)}).
            </p>

            <div style={{ display: "grid", gap: 8 }}>
              {analysis.slowTasks.map((t) => (
                <div
                  key={t.key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.20)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900 }}>
                      {t.a} × {t.b}
                      <span style={{ opacity: 0.7, fontWeight: 600 }}> ({t.correct ? "riktig" : "feil"})</span>
                    </div>
                    {!t.correct && (
                      <div style={{ opacity: 0.85, fontSize: 13 }}>
                        Ditt svar: <strong>{t.userAnswer ?? "—"}</strong> · Riktig: <strong>{t.correctAnswer}</strong>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", minWidth: 120 }}>
                    <div style={{ fontWeight: 900 }}>{fmtMs(t.ms)}</div>
                    <div style={{ opacity: 0.75, fontSize: 13 }}>{t.ratio.toFixed(1)}× median</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ opacity: 0.75, fontSize: 13 }}>
            Neste steg: vi kan bruke disse anbefalingene til å forhåndsvelge tabeller på <strong>Øve</strong>-siden.
          </section>
        </div>
      </main>
    );
  }

  // UI: pågående
  if (!task) {
    // Skal normalt ikke skje (men safe)
    return (
      <main style={{ padding: 18 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          ← Tilbake
        </Link>
        <h1 style={{ marginTop: 12 }}>Kartlegging</h1>
        <p>Ingen oppgaver funnet.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 18, maxWidth: 520 }}>
      <Link href="/" style={{ textDecoration: "none" }}>
        ← Tilbake
      </Link>

      <h1 style={{ marginTop: 12 }}>Kartlegging</h1>
      <p style={{ opacity: 0.75 }}>Oppgave {index + 1} av {tasks.length} (2–9)</p>

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
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        Neste
      </button>

      <p style={{ marginTop: 14, opacity: 0.7, fontSize: 12 }}>
        Tips: Trykk Enter for “Neste”.
      </p>
    </main>
  );
}
