"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* =========================
   Types
========================= */
type Task = {
  a: number;
  b: number;
  answer: number;
};

type AssessmentV1 = {
  byTable: Record<
    number,
    {
      attempts: number;
      correct: number;
      totalTimeMs?: number;
      medianTimeMs?: number;
    }
  >;
  updatedAt?: string;
};

/* =========================
   Config
========================= */
const ASSESS_KEY = "gs:kartlegging:v1"; // endre hvis kartleggingen din bruker annen key
const TABLE_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9] as const;
const DEFAULT_SELECTED = [2, 3, 4];

/* =========================
   Utils
========================= */
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeTask(tables: number[]): Task {
  const a = tables[randInt(0, tables.length - 1)];
  const b = randInt(0, 10);
  return { a, b, answer: a * b };
}

function safeJsonParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function uniqueSorted(nums: number[]) {
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

/**
 * Anbefal tabeller basert på:
 * - lav treffsikkerhet
 * - høy relativ responstid (mot barnets egen median på tvers av tabeller)
 */
function recommendTablesFromAssessment(
  a: AssessmentV1,
  topN = 3
): { tables: number[]; reason: string } {
  const rows = TABLE_OPTIONS.map((t) => {
    const entry = a.byTable?.[t];
    const attempts = entry?.attempts ?? 0;
    const correct = entry?.correct ?? 0;

    const accuracy = attempts > 0 ? correct / attempts : 1; // 1 hvis ingen data
    const wrongRate = 1 - accuracy;

    const timeMs =
      entry?.medianTimeMs ??
      (attempts > 0 ? (entry?.totalTimeMs ?? 0) / attempts : 0);

    return { t, attempts, wrongRate, timeMs };
  });

  // Median tid på tvers (for relativ treghet)
  const times = rows.map((r) => r.timeMs).filter((x) => x > 0);
  const medianAll = (() => {
    if (times.length === 0) return 0;
    const s = [...times].sort((x, y) => x - y);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  })();

  const scored = rows.map((r) => {
    const relSlow =
      medianAll > 0 && r.timeMs > 0 ? Math.max(0, (r.timeMs - medianAll) / medianAll) : 0;
    // Vekt litt mer på feil enn treghet
    const score = r.wrongRate * 1.0 + relSlow * 0.6;
    return { ...r, score };
  });

  // Prioriter tabeller med litt data
  const withData = scored.filter((r) => r.attempts >= 3);
  const base = withData.length >= 2 ? withData : scored;

  const top = [...base]
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((r) => r.t);

  const reason =
    withData.length === 0
      ? "Ingen/lite kartleggingsdata – viser en forsiktig anbefaling."
      : "Basert på lavest treffsikkerhet og/eller tregest responstid i kartleggingen.";

  return { tables: uniqueSorted(top), reason };
}

/* =========================
   Page
========================= */
export default function OvePage() {
  const router = useRouter();

  const [selectedTables, setSelectedTables] = useState<number[]>(DEFAULT_SELECTED);
  const [task, setTask] = useState<Task>(() => makeTask(DEFAULT_SELECTED));
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<null | "riktig" | "feil">(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [assessment, setAssessment] = useState<AssessmentV1 | null>(null);
  const [recommended, setRecommended] = useState<number[] | null>(null);
  const [recReason, setRecReason] = useState("");

  useEffect(() => {
    const a = safeJsonParse<AssessmentV1>(localStorage.getItem(ASSESS_KEY));
    if (a && a.byTable) {
      setAssessment(a);
      const rec = recommendTablesFromAssessment(a, 3);
      setRecommended(rec.tables);
      setRecReason(rec.reason);
    } else {
      setAssessment(null);
      setRecommended(null);
      setRecReason("");
    }
  }, []);

  function toggleTable(t: number) {
    setSelectedTables((prev) => {
      const next = prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t];
      return next.sort((a, b) => a - b);
    });
  }

  function nextTask(tables = selectedTables) {
    if (!tables || tables.length === 0) return;
    setTask(makeTask(tables));
    setInput("");
    setFeedback(null);
  }

  function submit() {
    if (input.trim() === "") return;

    const isCorrect = Number(input) === task.answer;
    setFeedback(isCorrect ? "riktig" : "feil");
    setTotalCount((c) => c + 1);
    if (isCorrect) setCorrectCount((c) => c + 1);

    setTimeout(() => nextTask(), 600);
  }

  function useRecommended() {
    if (!recommended || recommended.length === 0) return;
    setSelectedTables(recommended);
    setTask(makeTask(recommended));
    setInput("");
    setFeedback(null);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 16,
          padding: 20,
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
        }}
      >
        <h1 style={{ fontSize: 22, marginBottom: 10 }}>Øv på gangetabellen</h1>

        {/* Anbefalt fra kartlegging */}
        <div
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14,
            padding: 12,
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 6 }}>
            Anbefalt fra kartlegging
          </div>

          {recommended ? (
            <>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                {recommended.map((t) => (
                  <span
                    key={t}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "rgba(34,197,94,0.22)",
                      border: "1px solid rgba(34,197,94,0.55)",
                      color: "white",
                      fontSize: 14,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>
                {recReason}
              </div>

              <button
                onClick={useRecommended}
                style={{
                  width: "100%",
                  padding: 10,
                  fontSize: 15,
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  background: "#22c55e",
                  color: "white",
                }}
              >
                Bruk anbefalte tabeller
              </button>
            </>
          ) : (
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              Ingen kartlegging funnet ennå. Du kan fortsatt velge tabeller under.
            </div>
          )}
        </div>

        {/* Alle tabeller */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, marginBottom: 6 }}>Alle tabeller (velg fritt):</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {TABLE_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => toggleTable(t)}
                style={{
                  padding: "7px 11px",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  background: selectedTables.includes(t)
                    ? "#3b82f6"
                    : "rgba(255,255,255,0.15)",
                  color: "white",
                  fontSize: 14,
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {selectedTables.length === 0 && (
            <div style={{ marginTop: 8, fontSize: 13, color: "#fbbf24" }}>
              Velg minst én tabell for å øve.
            </div>
          )}
        </div>

        {/* Oppgave */}
        <div style={{ fontSize: 30, textAlign: "center", marginBottom: 10 }}>
          {task.a} × {task.b} = ?
        </div>

        <input
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          autoFocus
          style={{
            width: "100%",
            padding: "10px 12px",
            fontSize: 18,
            borderRadius: 10,
            border: "none",
            outline: "none",
            marginBottom: 10,
          }}
        />

        <button
          onClick={submit}
          disabled={selectedTables.length === 0}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 16,
            borderRadius: 10,
            border: "none",
            cursor: selectedTables.length === 0 ? "not-allowed" : "pointer",
            background: selectedTables.length === 0 ? "rgba(59,130,246,0.4)" : "#3b82f6",
            color: "white",
            marginBottom: 10,
          }}
        >
          Svar
        </button>

        {feedback && (
          <div
            style={{
              textAlign: "center",
              marginBottom: 8,
              color: feedback === "riktig" ? "#22c55e" : "#ef4444",
              fontSize: 15,
            }}
          >
            {feedback === "riktig" ? "Riktig!" : `Feil – riktig svar er ${task.answer}`}
          </div>
        )}

        <div style={{ fontSize: 14, textAlign: "center", opacity: 0.85, marginBottom: 14 }}>
          Riktig: {correctCount} / {totalCount}
        </div>

        <button
          onClick={() => router.push("/spill")}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 16,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.18)",
            cursor: "pointer",
            background: "rgba(0,0,0,0.25)",
            color: "white",
          }}
        >
          Videre til spillet →
        </button>

        {assessment?.updatedAt && (
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65, textAlign: "center" }}>
            Sist kartlagt: {new Date(assessment.updatedAt).toLocaleString("no-NO")}
          </div>
        )}
      </div>
    </div>
  );
}
