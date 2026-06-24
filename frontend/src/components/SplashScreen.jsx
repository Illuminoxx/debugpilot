import { useState, useEffect } from "react"

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState("in")

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("out"), 3500)
    const t2 = setTimeout(() => onDone(), 4200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000000",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", zIndex: 9999, gap: "32px",
      opacity: phase === "in" ? 1 : 0,
      transition: "opacity 0.7s ease",
      fontFamily: "'Inter', system-ui, sans-serif"
    }}>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: "16px",
        animation: "splashEntry 0.8s cubic-bezier(0.16,1,0.3,1) both"
      }}>
        <div style={{
          width: "72px", height: "72px",
          background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
          borderRadius: "20px", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "36px",
          boxShadow: "0 0 60px #4f46e566",
          animation: "logoFloat 3s ease-in-out infinite"
        }}>🤖</div>

        <div style={{ textAlign: "center" }}>
        <h1 style={{
  margin: 0, fontSize: "42px", fontWeight: 900,
  letterSpacing: "-0.04em", lineHeight: 1, color: "#e2e8f0"
}}>
  Debug<span style={{
    background: "linear-gradient(90deg, #818cf8, #a78bfa)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
  }}>Agent</span>
</h1>
          <p style={{ margin: "8px 0 0", color: "#475569", fontSize: "13px", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Powered by Groq · Llama 3.3 70B · LangGraph
          </p>
        </div>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px",
        maxWidth: "480px", width: "90%",
        animation: "splashEntry 0.8s 0.2s cubic-bezier(0.16,1,0.3,1) both"
      }}>
        {[
          { icon: "🔍", title: "Root Cause Analysis", desc: "Identifies the exact bug with confidence scoring" },
          { icon: "🔧", title: "Auto Patch", desc: "Rewrites broken code and shows a live diff" },
          { icon: "⚡", title: "Sandbox Execution", desc: "Runs and verifies the fix across 8 languages" },
          { icon: "📋", title: "Code Review", desc: "Scores quality and raises follow-up queries" },
        ].map(f => (
          <div key={f.title} style={{
            background: "#0a0a0a", border: "1px solid #1e293b",
            borderRadius: "12px", padding: "14px"
          }}>
            <div style={{ fontSize: "20px", marginBottom: "6px" }}>{f.icon}</div>
            <p style={{ margin: "0 0 4px", color: "#e2e8f0", fontSize: "13px", fontWeight: 700 }}>{f.title}</p>
            <p style={{ margin: 0, color: "#475569", fontSize: "11px", lineHeight: 1.5 }}>{f.desc}</p>
          </div>
        ))}
      </div>

      <div style={{
        animation: "splashEntry 0.8s 0.4s cubic-bezier(0.16,1,0.3,1) both",
        display: "flex", gap: "24px"
      }}>
        {[
          { value: "8", label: "Languages" },
          { value: "5x", label: "Self-Correction" },
          { value: "Free", label: "Zero Cost" },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#818cf8" }}>{s.value}</p>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#374151", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <p style={{
        color: "#1e293b", fontSize: "12px", margin: 0,
        animation: "pulse 1.5s ease-in-out infinite"
      }}>Loading...</p>

      <style>{`
        @keyframes splashEntry {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes logoFloat {
          0%,100% { transform: translateY(0) rotate(0deg); }
          25%      { transform: translateY(-4px) rotate(-5deg); }
          75%      { transform: translateY(4px) rotate(5deg); }
        }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
      `}</style>
    </div>
  )
}