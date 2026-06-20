import { useState } from "react"

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#facc15", low: "#4ade80", info: "#60a5fa" }
const SEV_BG =   { critical: "#2d0a0a", high: "#1c0e00", medium: "#1c1600", low: "#052e16", info: "#0c1a2e" }
const TYPE_ICON = { performance: "⚡", security: "🔒", readability: "📖", maintainability: "🔧", best_practice: "✨", potential_bug: "🐛" }
const TYPE_COLOR = { performance: "#fb923c", security: "#f87171", readability: "#60a5fa", maintainability: "#a78bfa", best_practice: "#34d399", potential_bug: "#f472b6" }

function ScoreArc({ score }) {
  const angle = (score / 100) * 180
  const rad = (angle - 180) * (Math.PI / 180)
  const x = 80 + 60 * Math.cos(rad)
  const y = 80 + 60 * Math.sin(rad)
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#facc15" : "#ef4444"
  const label = score >= 80 ? "Good" : score >= 60 ? "Fair" : "Needs Work"
  return (
    <div style={{ textAlign: "center", marginBottom: "16px" }}>
      <svg width="160" height="90" viewBox="0 0 160 90">
        <path d="M 20 80 A 60 60 0 0 1 140 80" fill="none" stroke="#1f2937" strokeWidth="10" strokeLinecap="round" />
        <path d={`M 20 80 A 60 60 0 0 1 ${x} ${y}`} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" style={{ transition: "all 1s ease" }} />
        <text x="80" y="72" textAnchor="middle" fill={color} fontSize="22" fontWeight="800">{score}</text>
        <text x="80" y="86" textAnchor="middle" fill="#475569" fontSize="10">{label}</text>
      </svg>
      <div style={{ color: "#475569", fontSize: "11px", marginTop: "-4px" }}>Code Quality Score</div>
    </div>
  )
}

export default function ReviewPanel({ review, sessionId, onQuery, queryHistory, apiUrl }) {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("issues")

  async function submitQuery(q) {
    const text = q || query.trim()
    if (!text || loading) return
    setLoading(true)
    setQuery("")
    onQuery({ role: "user", content: text })
    try {
      const res = await fetch(`${apiUrl}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, query: text })
      })
      const data = await res.json()
      onQuery({ role: "assistant", content: data.answer || "No answer returned." })
    } catch {
      onQuery({ role: "assistant", content: "Query failed. Check backend connection." })
    } finally {
      setLoading(false)
    }
  }

  const issues = review.issues || []
  const strengths = review.strengths || []
  const suggested = review.suggested_queries || []

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0", height: "100%" }}>
      <ScoreArc score={review.overall_score || 0} />

      <p style={{ color: "#94a3b8", fontSize: "13px", lineHeight: "1.6", margin: "0 0 16px", padding: "0 2px" }}>
        {review.summary}
      </p>

      <div style={{ display: "flex", gap: "4px", marginBottom: "14px" }}>
        {["issues", "strengths", "ask"].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            flex: 1, padding: "7px", borderRadius: "7px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600, textTransform: "capitalize",
            background: activeTab === t ? "#4f46e5" : "#111827",
            color: activeTab === t ? "#fff" : "#475569"
          }}>
            {t === "issues" ? `Issues (${issues.length})` : t === "strengths" ? `Strengths` : "Ask AI"}
          </button>
        ))}
      </div>

      {activeTab === "issues" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflow: "auto", flex: 1 }}>
          {issues.length === 0 && <p style={{ color: "#374151", fontSize: "13px", textAlign: "center", padding: "20px" }}>No issues found 🎉</p>}
          {issues.map((issue, i) => (
            <div key={i} style={{ background: SEV_BG[issue.severity] || "#111827", border: `1px solid ${SEV_COLOR[issue.severity]}33`, borderRadius: "8px", padding: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span style={{ fontSize: "14px" }}>{TYPE_ICON[issue.type] || "⚠️"}</span>
                <span style={{ color: TYPE_COLOR[issue.type] || "#94a3b8", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{issue.type}</span>
                <span style={{ marginLeft: "auto", background: SEV_COLOR[issue.severity] + "22", color: SEV_COLOR[issue.severity], fontSize: "10px", padding: "2px 8px", borderRadius: "20px" }}>
                  {issue.severity}
                </span>
              </div>
              <p style={{ color: "#e2e8f0", fontSize: "13px", margin: "0 0 6px", fontWeight: 600 }}>{issue.title}</p>
              <p style={{ color: "#64748b", fontSize: "12px", margin: "0 0 6px", lineHeight: "1.5" }}>{issue.description}</p>
              <p style={{ color: "#818cf8", fontSize: "12px", margin: 0, lineHeight: "1.5" }}>💡 {issue.suggestion}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === "strengths" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {strengths.map((s, i) => (
            <div key={i} style={{ background: "#052e16", border: "1px solid #166534", borderRadius: "8px", padding: "10px 12px", color: "#86efac", fontSize: "13px", display: "flex", gap: "8px" }}>
              <span>✅</span><span>{s}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === "ask" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
          {suggested.length > 0 && queryHistory.length === 0 && (
            <div>
              <p style={{ color: "#374151", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Suggested Questions</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {suggested.map((q, i) => (
                  <button key={i} onClick={() => submitQuery(q)} style={{
                    background: "#111827", border: "1px solid #1f2937", borderRadius: "8px", padding: "9px 12px",
                    color: "#94a3b8", fontSize: "12px", cursor: "pointer", textAlign: "left", lineHeight: "1.4",
                    transition: "border-color 0.15s, color 0.15s"
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#4f46e5"; e.currentTarget.style.color = "#e2e8f0" }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#1f2937"; e.currentTarget.style.color = "#94a3b8" }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
            {queryHistory.map((m, i) => (
              <div key={i} style={{
                background: m.role === "user" ? "#1e1b4b" : "#111827",
                border: `1px solid ${m.role === "user" ? "#3730a3" : "#1f2937"}`,
                borderRadius: "8px", padding: "10px 12px"
              }}>
                <div style={{ color: m.role === "user" ? "#818cf8" : "#475569", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
                  {m.role === "user" ? "You" : "AI"}
                </div>
                <p style={{ color: "#e2e8f0", fontSize: "13px", margin: 0, lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{m.content}</p>
              </div>
            ))}
            {loading && (
              <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ color: "#475569", fontSize: "10px", marginBottom: "4px" }}>AI</div>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: "6px", height: "6px", background: "#4f46e5", borderRadius: "50%", animation: `bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitQuery() } }}
              placeholder="Ask anything about this code..."
              style={{ flex: 1, background: "#111827", color: "#e2e8f0", border: "1px solid #1f2937", borderRadius: "8px", padding: "9px 12px", fontSize: "13px", outline: "none" }}
            />
            <button onClick={() => submitQuery()} disabled={!query.trim() || loading} style={{
              background: "#4f46e5", color: "#fff", border: "none", borderRadius: "8px",
              padding: "9px 16px", cursor: "pointer", fontSize: "13px", fontWeight: 600,
              opacity: !query.trim() || loading ? 0.5 : 1
            }}>
              Ask
            </button>
          </div>
        </div>
      )}
    </div>
  )
}