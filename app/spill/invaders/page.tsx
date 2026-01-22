"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/* =========================
   Types
========================= */
type EnemyKind = "A" | "B" | "C";

type Enemy = {
  id: string;
  x: number; // 0..1
  y: number; // 0..1
  vx: number;
  vy: number;
  a: number;
  b: number;
  size: number; // px-ish base
  kind: EnemyKind;
  phase: number;
};

type Laser = {
  x: number; // 0..1
  y0: number; // 0..1
  y1: number; // 0..1
  life: number; // seconds
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
};

/* =========================
   Utils
========================= */
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const rand = (a: number, b: number) => Math.random() * (b - a) + a;
const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
const uid = () => Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);

function loadBest() {
  try {
    return Number(localStorage.getItem("invaders_best") || "0") || 0;
  } catch {
    return 0;
  }
}
function saveBest(n: number) {
  try {
    localStorage.setItem("invaders_best", String(n));
  } catch {}
}

/* =========================
   Sound (simple WebAudio)
   Note: iOS sometimes blocks until user gesture.
========================= */
function tone(freq: number, duration = 0.1, type: OscillatorType = "square", gainValue = 0.08) {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = gainValue;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    osc.onended = () => {
      try { ctx.close(); } catch {}
    };
  } catch {}
}

/* =========================
   Component
========================= */
export default function InvadersPage() {
  const tables = useMemo(() => [2, 3, 4, 5, 6, 7, 8, 9], []);

  const [mode, setMode] = useState<"menu" | "playing" | "over">("menu");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [task, setTask] = useState<{ a: number; b: number } | null>(null);
  const [answer, setAnswer] = useState("");
  const [hint, setHint] = useState("Trykk Start");

  // ✅ NEW: tabellvalg (default: alle)
  const [selectedTables, setSelectedTables] = useState<number[]>([2, 3, 4, 5, 6, 7, 8, 9]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dprRef = useRef(1);

  const enemiesRef = useRef<Enemy[]>([]);
  const lasersRef = useRef<Laser[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<{ x: number; y: number; z: number }[]>([]);

  const rafRef = useRef<number | null>(null);
  const lastTRef = useRef<number | null>(null);
  const spawnAccRef = useRef(0);
  const shakeRef = useRef(0);

  const perfRef = useRef({
    correct: 0,
    wrong: 0,
    avgMs: 2000,
    taskAt: 0,
  });

  // ✅ Slower start, fewer enemies early
  const diffRef = useRef({
    spawnEvery: 1.8,   // slower start
    enemySpeed: 0.055, // slower
    maxEnemies: 5,     // fewer
  });

  function resetGame() {
    enemiesRef.current = [];
    lasersRef.current = [];
    particlesRef.current = [];
    spawnAccRef.current = 0;
    lastTRef.current = null;
    perfRef.current = { correct: 0, wrong: 0, avgMs: 2000, taskAt: 0 };
    diffRef.current = { spawnEvery: 3.6, enemySpeed: 0.025, maxEnemies: 5 };

    setScore(0);
    setLives(3);
    setStreak(0);
    setTask(null);
    setAnswer("");
    setHint("Klar!");
  }

  function start() {
    // ✅ Don't start without tables selected
    if (selectedTables.length === 0) {
      setHint("Velg minst én tabell før du starter.");
      return;
    }

    resetGame();
    setMode("playing");
    setHint("Skyt fiender ved å svare riktig!");
    setTimeout(() => spawnEnemy(), 250);
  }

  function endGame() {
    setMode("over");
    setHint("Game Over");
    setBest((prev) => {
      const next = Math.max(prev, score);
      saveBest(next);
      return next;
    });
  }

  function chooseTask() {
    const list = enemiesRef.current;
    if (!list.length) {
      setTask(null);
      return;
    }
    const target = list.reduce((bestE, e) => (e.y > bestE.y ? e : bestE), list[0]);
    setTask({ a: target.a, b: target.b });
    perfRef.current.taskAt = performance.now();
    setHint(`Skyt: ${target.a}×${target.b}`);
  }

  function spawnEnemy() {
    // ✅ NEW: use selected tables only
    if (selectedTables.length === 0) return;

    const a = selectedTables[randInt(0, selectedTables.length - 1)];
    const b = randInt(1, 10);
    const kind: EnemyKind = (["A", "B", "C"][randInt(0, 2)] as EnemyKind);

    const e: Enemy = {
      id: uid(),
      x: rand(0.12, 0.88),
      y: -0.14,
      vx: rand(-0.03, 0.03),
      vy: diffRef.current.enemySpeed * rand(0.85, 1.2),
      a,
      b,
      size: rand(40, 56),
      kind,
      phase: rand(0, Math.PI * 2),
    };

    enemiesRef.current = [e, ...enemiesRef.current].slice(0, diffRef.current.maxEnemies);

    setTask((prev) => {
      if (prev) return prev;
      setTask({ a: e.a, b: e.b });
      perfRef.current.taskAt = performance.now();
      setHint(`Skyt: ${e.a}×${e.b}`);
      return { a: e.a, b: e.b };
    });
  }

  // ✅ Gentler scaling
  function recalcDifficulty(nextStreak: number) {
    const p = perfRef.current;
    const total = p.correct + p.wrong;
    const acc = total ? p.correct / total : 0.6;
    const speedFactor = clamp(2400 / p.avgMs, 0.7, 1.9);
    const streakFactor = clamp(1 + nextStreak / 16, 1, 2.0);
    const accFactor = clamp(0.8 + acc, 0.8, 1.65);
    const skill = clamp((speedFactor * streakFactor * accFactor) / 1.25, 0.75, 2.4);

    diffRef.current.spawnEvery = clamp(3.6 / skill, 1.6, 3.6);
    diffRef.current.enemySpeed = clamp(0.030 * (0.95 + skill * 0.35), 0.026, 0.085);
    diffRef.current.maxEnemies = clamp(Math.floor(2 + skill * 0.65), 2, 5);
  }

  function explode(x: number, y: number, power = 1) {
    const n = Math.floor(18 * power);
    for (let i = 0; i < n; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: rand(-0.28, 0.28) * power,
        vy: rand(-0.35, 0.15) * power,
        life: rand(0.25, 0.7),
      });
    }
    shakeRef.current = performance.now();
    tone(140, 0.12, "triangle", 0.09);
  }

  function fireLaserAt(x: number, yTarget: number) {
    lasersRef.current.push({
      x,
      y0: 0.90,
      y1: yTarget,
      life: 0.14,
    });
    tone(880, 0.06, "square", 0.07);
  }

  function submit() {
    if (mode !== "playing" || !task) return;

    const v = Number(answer.trim());
    if (!Number.isFinite(v)) return;

    const correct = task.a * task.b;
    const now = performance.now();
    const dt = now - perfRef.current.taskAt;
    perfRef.current.avgMs = perfRef.current.avgMs * 0.85 + dt * 0.15;

    setAnswer("");

    if (v === correct) {
      // find matching enemy closest to bottom
      const list = enemiesRef.current;
      let idx = -1;
      let bestY = -1;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (e.a === task.a && e.b === task.b) {
          if (e.y > bestY) { bestY = e.y; idx = i; }
        }
      }
      // fallback: most threatening
      if (idx === -1 && list.length) {
        idx = list.reduce((bi, e, i, arr) => (e.y > arr[bi].y ? i : bi), 0);
      }

      if (idx >= 0) {
        const e = enemiesRef.current[idx];
        fireLaserAt(e.x, e.y);
        explode(e.x, e.y, 1.25);
        enemiesRef.current = enemiesRef.current.filter((_, i) => i !== idx);
      }

      perfRef.current.correct += 1;
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      recalcDifficulty(nextStreak);

      const speedBonus = clamp(2600 / perfRef.current.avgMs, 0.8, 2.2);
      setScore((s) => s + Math.floor(90 * speedBonus) + Math.min(160, nextStreak * 8));

      chooseTask();
    } else {
      perfRef.current.wrong += 1;
      setStreak(0);
      recalcDifficulty(0);
      tone(220, 0.12, "sawtooth", 0.08);

      setHint(`Feil. ${task.a}×${task.b} = ${correct}`);
      setLives((l) => {
        const next = l - 1;
        if (next <= 0) setTimeout(endGame, 120);
        return next;
      });
    }
  }

  // Canvas setup
  useEffect(() => {
    setBest(typeof window === "undefined" ? 0 : loadBest());

    const c = canvasRef.current;
    if (!c) return;

    const stars = [];
    for (let i = 0; i < 150; i++) stars.push({ x: Math.random(), y: Math.random(), z: Math.random() });
    starsRef.current = stars;

    const resize = () => {
      const rect = c.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dprRef.current = dpr;
      c.width = Math.floor(rect.width * dpr);
      c.height = Math.floor(rect.height * dpr);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  // Main loop (✅ ctx locked)
  useEffect(() => {
    if (mode !== "playing") {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTRef.current = null;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx0 = canvas.getContext("2d", { alpha: false });
    if (!ctx0) return;
    const ctx = ctx0; // ✅ TS now knows it's not null

    const loop = (t: number) => {
      if (lastTRef.current == null) lastTRef.current = t;
      const dt = Math.min((t - lastTRef.current) / 1000, 0.033);
      lastTRef.current = t;

      // spawn
      spawnAccRef.current += dt;
      if (spawnAccRef.current >= diffRef.current.spawnEvery) {
        spawnAccRef.current = 0;
        if (enemiesRef.current.length < diffRef.current.maxEnemies) spawnEnemy();
      }

      // update enemies
      const base = diffRef.current.enemySpeed;
      enemiesRef.current = enemiesRef.current
        .map((e) => {
          const ph = e.phase + dt * 2.2;
          const sway = Math.sin(ph) * 0.025;
          let nx = e.x + e.vx * dt + sway * dt;
          nx = clamp(nx, 0.08, 0.92);
          const ny = e.y + (e.vy + base * 0.25) * dt;
          let vx = e.vx;
          if (nx <= 0.081 || nx >= 0.919) vx = -vx * 0.9;
          return { ...e, x: nx, y: ny, vx, phase: ph };
        })
        .filter((e) => e.y < 1.2);

      // reached bottom -> lose life
      const reached = enemiesRef.current.find((e) => e.y >= 0.92);
      if (reached) {
        enemiesRef.current = enemiesRef.current.filter((e) => e.id !== reached.id);
        explode(reached.x, 0.92, 1.6);
        setStreak(0);
        recalcDifficulty(0);
        setLives((l) => {
          const next = l - 1;
          if (next <= 0) setTimeout(endGame, 120);
          return next;
        });
        setHint("De kom for nær! −1 liv");
      }

      // update lasers
      lasersRef.current = lasersRef.current
        .map((l) => ({ ...l, life: l.life - dt }))
        .filter((l) => l.life > 0);

      // particles
      particlesRef.current = particlesRef.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx * dt,
          y: p.y + p.vy * dt,
          vx: p.vx * 0.98,
          vy: p.vy * 0.98 + 0.08 * dt,
          life: p.life - dt,
        }))
        .filter((p) => p.life > 0);

      // ensure task
      if (!task && enemiesRef.current.length) {
        queueMicrotask(chooseTask);
      }

      draw(ctx, canvas.width, canvas.height);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, task, streak, score]);

  function draw(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const dpr = dprRef.current || 1;

    // shake
    const shakeMs = 140;
    const since = performance.now() - shakeRef.current;
    let sx = 0, sy = 0;
    if (since >= 0 && since < shakeMs) {
      const k = 1 - since / shakeMs;
      sx = (Math.random() - 0.5) * 10 * k * dpr;
      sy = (Math.random() - 0.5) * 10 * k * dpr;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(sx, sy);

    // bg gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#070A14");
    bg.addColorStop(0.55, "#07081A");
    bg.addColorStop(1, "#05050B");
    ctx.fillStyle = bg;
    ctx.fillRect(-20, -20, W + 40, H + 40);

    // stars
    const stars = starsRef.current;
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.y += (0.02 + s.z * 0.09) * 0.016;
      if (s.y > 1) s.y = 0;
      const x = s.x * W;
      const y = s.y * H;
      const r = (0.6 + s.z * 1.9) * dpr;
      ctx.globalAlpha = 0.35 + s.z * 0.55;
      ctx.fillStyle = "#DCE7FF";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // horizon glow
    const glow = ctx.createRadialGradient(W * 0.5, H * 0.92, 0, W * 0.5, H * 0.92, H * 0.75);
    glow.addColorStop(0, "rgba(120,140,255,0.18)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // ship
    drawShip(ctx, W, H, dpr);

    // lasers
    for (const l of lasersRef.current) drawLaser(ctx, W, H, dpr, l);

    // enemies
    for (const e of enemiesRef.current) drawEnemy(ctx, W, H, dpr, e);

    // particles
    for (const p of particlesRef.current) {
      const a = clamp(p.life / 0.7, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, 2.2 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // HUD
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(14 * dpr, 14 * dpr, 260 * dpr, 96 * dpr);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = `${14 * dpr}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto`;
    ctx.fillText(`Score: ${score}`, 26 * dpr, 42 * dpr);
    ctx.fillText(`Best: ${best}`, 26 * dpr, 64 * dpr);
    ctx.fillText(`Lives: ${"❤".repeat(lives)}`, 26 * dpr, 86 * dpr);
  }

  function drawShip(ctx: CanvasRenderingContext2D, W: number, H: number, dpr: number) {
    const x = W * 0.5;
    const y = H * 0.9;
    const thr = ctx.createRadialGradient(x, y + 26 * dpr, 0, x, y + 26 * dpr, 56 * dpr);
    thr.addColorStop(0, "rgba(120,170,255,0.35)");
    thr.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = thr;
    ctx.beginPath();
    ctx.ellipse(x, y + 26 * dpr, 44 * dpr, 22 * dpr, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(235,242,255,0.92)";
    ctx.beginPath();
    ctx.moveTo(x, y - 30 * dpr);
    ctx.lineTo(x - 30 * dpr, y + 22 * dpr);
    ctx.lineTo(x, y + 10 * dpr);
    ctx.lineTo(x + 30 * dpr, y + 22 * dpr);
    ctx.closePath();
    ctx.fill();
  }

  function drawLaser(ctx: CanvasRenderingContext2D, W: number, H: number, dpr: number, l: Laser) {
    const alpha = clamp(l.life / 0.14, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "rgba(125,249,255,0.95)";
    ctx.lineWidth = 3.5 * dpr;
    ctx.beginPath();
    ctx.moveTo(l.x * W, l.y0 * H);
    ctx.lineTo(l.x * W, l.y1 * H);
    ctx.stroke();

    // glow
    ctx.globalAlpha = alpha * 0.35;
    ctx.lineWidth = 10 * dpr;
    ctx.beginPath();
    ctx.moveTo(l.x * W, l.y0 * H);
    ctx.lineTo(l.x * W, l.y1 * H);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawEnemy(ctx: CanvasRenderingContext2D, W: number, H: number, dpr: number, e: Enemy) {
    const x = e.x * W;
    const y = e.y * H;
    const s = e.size * dpr;

    // per-kind palette
    const palette =
      e.kind === "A"
        ? { glow: "rgba(255,120,200,0.22)", top: "rgba(255,210,245,0.95)", bot: "rgba(210,120,220,0.85)" }
        : e.kind === "B"
        ? { glow: "rgba(120,255,200,0.20)", top: "rgba(200,255,235,0.95)", bot: "rgba(110,220,170,0.85)" }
        : { glow: "rgba(255,220,120,0.20)", top: "rgba(255,245,200,0.95)", bot: "rgba(230,170,90,0.85)" };

    // glow
    const g = ctx.createRadialGradient(x, y, 0, x, y, s * 1.5);
    g.addColorStop(0, palette.glow);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, s * 1.25, 0, Math.PI * 2);
    ctx.fill();

    // body gradient
    const body = ctx.createLinearGradient(x, y - s, x, y + s);
    body.addColorStop(0, palette.top);
    body.addColorStop(1, palette.bot);
    ctx.fillStyle = body;

    // different shapes by kind
    ctx.beginPath();
    if (e.kind === "A") {
      // classic invader-ish
      ctx.moveTo(x - 0.9 * s, y - 0.2 * s);
      ctx.lineTo(x - 0.6 * s, y - 0.8 * s);
      ctx.lineTo(x - 0.2 * s, y - 0.55 * s);
      ctx.lineTo(x, y - 0.9 * s);
      ctx.lineTo(x + 0.2 * s, y - 0.55 * s);
      ctx.lineTo(x + 0.6 * s, y - 0.8 * s);
      ctx.lineTo(x + 0.9 * s, y - 0.2 * s);
      ctx.lineTo(x + 0.55 * s, y + 0.35 * s);
      ctx.lineTo(x + 0.2 * s, y + 0.1 * s);
      ctx.lineTo(x + 0.1 * s, y + 0.75 * s);
      ctx.lineTo(x, y + 0.5 * s);
      ctx.lineTo(x - 0.1 * s, y + 0.75 * s);
      ctx.lineTo(x - 0.2 * s, y + 0.1 * s);
      ctx.lineTo(x - 0.55 * s, y + 0.35 * s);
      ctx.closePath();
    } else if (e.kind === "B") {
      // diamond drone
      ctx.moveTo(x, y - 0.95 * s);
      ctx.lineTo(x + 0.85 * s, y);
      ctx.lineTo(x, y + 0.95 * s);
      ctx.lineTo(x - 0.85 * s, y);
      ctx.closePath();
    } else {
      // rounded saucer
      ctx.ellipse(x, y, 0.95 * s, 0.75 * s, 0, 0, Math.PI * 2);
    }
    ctx.fill();

    // eyes for A/C
    ctx.fillStyle = "rgba(10,12,20,0.9)";
    if (e.kind !== "B") {
      ctx.beginPath();
      ctx.arc(x - 0.28 * s, y - 0.1 * s, 0.14 * s, 0, Math.PI * 2);
      ctx.arc(x + 0.28 * s, y - 0.1 * s, 0.14 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // ✅ Bigger math text
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = `${Math.max(16, Math.floor(20 * dpr))}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${e.a}×${e.b}`, x, y + 0.28 * s);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  // keyboard
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Enter") submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, task, answer, streak, score]);

  // UI helpers
  const allSelected = selectedTables.length === tables.length;
  const noneSelected = selectedTables.length === 0;

  function toggleTable(n: number) {
    setSelectedTables((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b)));
  }
  function selectAll() {
    setSelectedTables([...tables]);
  }
  function selectNone() {
    setSelectedTables([]);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#05050B", color: "white" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
        <h1 style={{ margin: "8px 0 2px", fontSize: 28 }}>Space Invaders – Gangesertifikatet</h1>
        <p style={{ margin: "0 0 12px", opacity: 0.85 }}>
          Rolig start. Større gangestykker. Varierte fiender. Laser + lyd.
        </p>

        <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 10px 30px rgba(0,0,0,0.45)" }}>
          <div style={{ position: "relative", height: 540 }}>
            <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 18 }}>
              <div style={{ opacity: 0.92, fontSize: 16 }}>{hint}</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10, borderRadius: 16, padding: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}>
          {/* ✅ NEW: Tabellvalg (kun når ikke spiller) */}
          {mode !== "playing" && (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontWeight: 800, opacity: 0.95 }}>Velg tabeller før du starter:</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {tables.map((n) => {
                  const active = selectedTables.includes(n);
                  return (
                    <button
                      key={n}
                      onClick={() => toggleTable(n)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.18)",
                        background: active ? "rgba(255,255,255,0.18)" : "transparent",
                        color: "white",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      {n}-gangen
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={selectAll} style={btnGhost} disabled={allSelected}>Velg alle</button>
                <button onClick={selectNone} style={btnGhost} disabled={noneSelected}>Velg ingen</button>
                <div style={{ opacity: 0.8 }}>
                  Valgt: <b>{selectedTables.length ? selectedTables.join(", ") : "—"}</b>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {mode !== "playing" ? (
              <button
                onClick={start}
                disabled={selectedTables.length === 0}
                style={{
                  ...btnPrimary,
                  opacity: selectedTables.length === 0 ? 0.55 : 1,
                  cursor: selectedTables.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                Start
              </button>
            ) : (
              <button onClick={() => { setMode("menu"); setHint("Pauset"); }} style={btnPrimary}>Pause</button>
            )}

            <button onClick={() => { resetGame(); setMode("menu"); }} style={btnGhost}>Reset</button>

            <div style={{ marginLeft: "auto", opacity: 0.9 }}>
              <span style={{ marginRight: 14 }}>Score: <b>{score}</b></span>
              <span style={{ marginRight: 14 }}>Best: <b>{best}</b></span>
              <span>Liv: <b>{"❤".repeat(lives)}</b></span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ opacity: 0.9 }}>
              Oppgave: <b style={{ fontSize: 18 }}>{task ? `${task.a}×${task.b}` : "—"}</b>
            </div>

            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              inputMode="numeric"
              placeholder="Svar…"
              style={inp}
              disabled={mode !== "playing"}
            />

            <button onClick={submit} disabled={mode !== "playing"} style={mode === "playing" ? btnPrimary : btnDisabled}>
              Skyt (Enter)
            </button>

            <div style={{ opacity: 0.75 }}>Streak: <b>{streak}</b></div>

            {mode === "over" && (
              <div style={{ marginLeft: "auto", opacity: 0.95 }}>
                <b>Game Over.</b> Trykk Start for ny runde.
              </div>
            )}
          </div>

          <div style={{ opacity: 0.7, fontSize: 13 }}>
            Vanskelighet øker gradvis (snill start). Lyd kan være blokkert til du trykker Start i noen nettlesere.
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Styles
========================= */
const btnPrimary: React.CSSProperties = {
  borderRadius: 12,
  padding: "10px 14px",
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.10)",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
};
const btnGhost: React.CSSProperties = {
  borderRadius: 12,
  padding: "10px 14px",
  border: "1px solid rgba(255,255,255,0.16)",
  background: "transparent",
  color: "white",
  cursor: "pointer",
};
const btnDisabled: React.CSSProperties = {
  ...btnPrimary,
  background: "rgba(255,255,255,0.05)",
  cursor: "not-allowed",
  opacity: 0.7,
};
const inp: React.CSSProperties = {
  width: 140,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(0,0,0,0.25)",
  color: "white",
  outline: "none",
};
