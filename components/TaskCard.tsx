"use client";

import { useEffect, useRef, useState } from "react";
import type { Task } from "../lib/taskEngine";

export default function TaskCard({
  task,
  onSubmit,
}: {
  task: Task;
  onSubmit: (answer: number | null) => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue("");
    inputRef.current?.focus();
  }, [task.text]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return onSubmit(null);
    const n = Number(trimmed);
    if (Number.isFinite(n)) onSubmit(n);
    else onSubmit(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm text-white/70">Reaksjon + korrekthet</div>

      <div className="text-4xl font-semibold tracking-tight">{task.text}</div>

      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          inputMode="numeric"
          className="w-full md:w-72 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
          placeholder="Svar"
        />

        <button
          onClick={submit}
          className="rounded-xl bg-violet-600/80 px-5 py-3 font-semibold hover:bg-violet-600"
        >
          OK
        </button>
      </div>

      <div className="text-xs text-white/50">Svar med Enter eller OK</div>
    </div>
  );
}
