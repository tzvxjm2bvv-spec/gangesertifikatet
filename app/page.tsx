"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const CardButton = ({
    title,
    subtitle,
    onClick,
    icon,
  }: {
    title: string;
    subtitle: string;
    icon: string;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: 18,
        borderRadius: 16,
        border: "1px solid rgba(0,0,0,0.10)",
        background: "rgba(255,255,255,0.85)",
        boxShadow: "0 10px 28px rgba(0,0,0,0.08)",
        cursor: "pointer",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          display: "grid",
          placeItems: "center",
          background: "rgba(0,0,0,0.06)",
          flex: "0 0 auto",
          fontSize: 22,
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>
          {title}
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 13.5,
            opacity: 0.8,
            lineHeight: 1.35,
          }}
        >
          {subtitle}
        </div>
      </div>

      <div style={{ opacity: 0.5, fontSize: 18, paddingTop: 2 }}>›</div>
    </button>
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 18,
        background:
          "radial-gradient(1000px 500px at 20% 0%, rgba(0,0,0,0.06), transparent 60%), linear-gradient(180deg, #f7f7fb, #efeff6)",
      }}
    >
      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <header style={{ padding: "10px 4px 6px 4px" }}>
          <div style={{ fontSize: 14, opacity: 0.7, fontWeight: 700 }}>
            Gangesertifikatet
          </div>
          <h1 style={{ margin: "6px 0 0 0", fontSize: 28, fontWeight: 900 }}>
            Velg modus
          </h1>
          <div style={{ marginTop: 6, fontSize: 14, opacity: 0.75 }}>
            Start med kartlegging, øv på det som er vanskelig, og ta prøven når
            du er klar.
          </div>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <CardButton
            icon="🟡"
            title="Kartlegging"
            subtitle="Finn hvilke tabeller som er vanskeligst og hvilke oppgaver som tar lengst tid."
            onClick={() => router.push("/kartlegging")}
          />
          <CardButton
            icon="🟢"
            title="Øve"
            subtitle="Øv på valgte eller anbefalte tabeller. Her kan du også spille."
            onClick={() => router.push("/ove")}
          />
          <CardButton
            icon="🏆"
            title="Prøve"
            subtitle="Gangesertifikatet: 100 oppgaver (0–10), 5 minutter, maks 2 feil."
            onClick={() => router.push("/prove")}
          />
        </div>

        <footer style={{ marginTop: 18, opacity: 0.6, fontSize: 12 }}>
          Tips: Du kan alltid gå tilbake hit fra øving og prøve.
        </footer>
      </div>
    </main>
  );
}
