"use client";
import Link from "next/link";

export default function KartleggingPage() {
  return (
    <main style={{ padding: 18 }}>
      <Link href="/" style={{ textDecoration: "none" }}>← Tilbake</Link>
      <h1 style={{ marginTop: 12 }}>Kartlegging</h1>
      <p>Her kobler vi inn kartleggingsprøven.</p>
    </main>
  );
}
