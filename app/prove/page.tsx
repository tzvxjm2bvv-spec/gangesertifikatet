"use client";
import Link from "next/link";

export default function ProvePage() {
  return (
    <main style={{ padding: 18 }}>
      <Link href="/" style={{ textDecoration: "none" }}>← Tilbake</Link>
      <h1 style={{ marginTop: 12 }}>Prøve</h1>
      <p>Her kommer sertifikat-prøven.</p>
    </main>
  );
}
