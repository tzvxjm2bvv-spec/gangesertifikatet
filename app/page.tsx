export default function Home() {
  return (
    <main style={{ minHeight: "100vh", background: "#05050B", color: "white" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 18 }}>
        <h1 style={{ fontSize: 32, margin: "10px 0" }}>Gangesertifikatet</h1>
        <p style={{ opacity: 0.85, marginTop: 0 }}>Velg spill:</p>

        <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
          <a href="/spill/invaders" style={card}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>🚀 Space Invaders</div>
            <div style={{ opacity: 0.8 }}>Skyt fiender ved å løse gangestykker</div>
          </a>

          <a href="/spill/space-race" style={card}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>🏁 Space Race</div>
            <div style={{ opacity: 0.8 }}>Kjør mot deg selv og slå rekord</div>
          </a>
        </div>
      </div>
    </main>
  );
}

const card: React.CSSProperties = {
  display: "block",
  padding: 16,
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  textDecoration: "none",
  color: "white",
  boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
};
