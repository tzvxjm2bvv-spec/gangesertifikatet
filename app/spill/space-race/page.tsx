"use client";

import { useMemo, useRef, useState } from "react";
import TaskCard from "../../../components/TaskCard";
import { makeTask, type TaskResult } from "../../../lib/taskEngine";

export default function SpaceRacePage() {
  const [task, setTask] = useState(() => makeTask());
  const [results, setResults] = useState<TaskResult[]>([]);
  const startRef = useRef<number>(performance.now());

  const stats = useMemo(() => {
    const n = results.length;
    if (!n) return { n: 0, correct: 0, avgMs: 0 };
    const correct = results.filter((r) => r.correct).length;
    const avgMs = Math.round(results.reduce((a, r) => a + r.ms, 0) / n);
    return { n, correct, avgMs };
  }, [results]);

  function next(answer: number | null) {
    const now = performance.now();
    const correct = answer !== null && answer === task.answer;

    const r: TaskResult = {
      task,
      userAnswer: answer,
      correct,
      ms: now - startRef.current,
      ts: Date.now(),
    };

    setResults((prev) => [r, ...prev].slice(0, 12));
    setTask(makeTask());
    startRef.current = performance.now();
  }

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6">
          <div className="text-3xl font-semibold">🚀 Space Race</div>
          <div className="text-white/70">
            Løs gangestykker så raskt du kan. (Stabil base)
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3 text-sm">
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
            Oppgaver: <b>{stats.n}</b>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
            Riktige: <b>{stats.correct}</b>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
            Snitt tid: <b>{stats.avgMs} ms</b>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl">
          <TaskCard task={task} onSubmit={next} />
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="mb-3 text-sm font-semibold text-white/80">Siste:</div>
          <div className="flex flex-wrap gap-2">
            {results.length === 0 ? (
              <div className="text-white/50 text-sm">Ingen ennå</div>
            ) : (
              results.slice(0, 5).map((r, i) => (
                <div
                  key={i}
                  className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs"
                >
                  {r.task.text} {r.correct ? "✅" : "❌"} · {Math.round(r.ms)}ms
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
