import { useState, useEffect } from "react"

const statusColor = { solved: "#22c55e", max_iterations_reached: "#f59e0b", unknown: "#64748b" }
const statusLabel = { solved: "✅ Solved", max_iterations_reached: "⚠️ Partial", unknown: "—" }
const LANG_ICONS = { python:"🐍",javascript:"🟨",typescript:"🔷",java:"☕",c:"⚙️",cpp:"🔩",csharp:"💜",go:"🐹",rust:"🦀",php:"🐘",ruby:"💎" }

export default function History({ onLoadSession, apiUrl }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${apiUrl}/history`).then(r => r.json()).then(d => { setSessions(d); setLoading(false) }).catch(() => setLoading(false))
  }, [apiUrl])

  if (loading) return <div style={{ color: "#374151", textAlign: "center", padding: "60px" }}>Loading...</div>
  if (!sessions.length) return (
    <div style={{ color: "#1f2937", textAlign: "center", padding: "80px", fontSize: "14px" }}>
      <div style={{ fontSize: "40px", marginBottom: "12px" }}>📭</div>
      No sessions yet. Run your first debug.
    </div>
  )

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "8px" }}>
      <p style={{ color: "#374151", fontSize: "12px", margin: "0 0 8px" }}>{sessions.length} past sessions — click any to reload</p>
      {sessions.map(s => (
        <div key={s.id} onClick={() => onLoadSession(s.id)} style={{
          background: "#0d1117", border: "1px solid #161b22", borderRadius: "10px",
          padding: "14px 16px", cursor: "pointer", transition: "border-color 0.15s, background 0.15s"
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#4f46e5"; e.currentTarget.style.background = "#0f1520" }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#161b22"; e.currentTarget.style.background = "#0d1117" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
              <span>{LANG_ICONS[s.language] || "💻"}</span>
              {s.language?.toUpperCase()} · {s.iterations_taken} iter{s.iterations_taken > 1 ? "s" : ""}
            </span>
            <span style={{ color: statusColor[s.status] || "#64748b", fontSize: "12px" }}>{statusLabel[s.status] || s.status}</span>
          </div>
          {s.root_cause && <p style={{ color: "#e2e8f0", fontSize: "13px", margin: "0 0 4px", fontWeight: 500 }}>{s.root_cause}</p>}
          <p style={{ color: "#374151", fontSize: "11px", margin: 0, fontFamily: "monospace", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{s.original_error}</p>
        </div>
      ))}
    </div>
  )
}