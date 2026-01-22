"use client";
import Link from "next/link";

export default function OvePage() {
  return (
    <main style={{ padding: 18 }}>
      <Link href="/" style={{ textDecoration: "none" }}>← Tilbake</Link>
      <h1 style={{ marginTop: 12 }}>Øve</h1>
      <p>Her kommer øving og spill.</p>
    </main>
  );
}
