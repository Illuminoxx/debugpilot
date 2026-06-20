import { useState } from "react"
import ReactDiffViewer from "react-diff-viewer-continued"

const BUG_COLORS = {
  NullReference: "#f87171", IndexOutOfBounds: "#fb923c", TypeMismatch: "#facc15",
  LogicError: "#a78bfa", SyntaxError: "#60a5fa", DivisionByZero: "#f472b6",
  MemoryError: "#ef4444", ConcurrencyError: "#818cf8", ImportError: "#34d399",
  NetworkError: "#22d3ee", Other: "#94a3b8"
}
const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#facc15", low: "#4ade80", info: "#60a5fa" }
const SEV_BG = { critical: "#2d0a0a", high: "#1c0e00", medium: "#1c1600", low: "#052e16", info: "#0c1a2e" }

function ConfidenceRing({ value }) {
  const r = 22, c = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, value))
  const color = pct >= 80 ? "#22c55e" : pct >= 60 ? "#facc15" : "#f87171"
  return (
    <svg width="60" height="60" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="30" cy="30" r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
      <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      <text x="30" y="35" textAnchor="middle" fill={color} fontSize="13" fontWeight="700"
        style={{ transform: "rotate(90deg) translate(0px, -60px)" }}>
        {pct}%
      </text>
    </svg>
  )
}

function StepCard({ step, originalCode, isLast }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ position: "relative", paddingLeft: "28px" }}>
      <div style={{
        position: "absolute", left: "8px", top: "16px", bottom: isLast ? "auto" : "0",
        width: "2px", background: "linear-gradient(to bottom, #4f46e5, #1e1e3a)"
      }} />
      <div style={{
        position: "absolute", left: "0px", top: "14px", width: "18px", height: "18px",
        borderRadius: "50%", background: step.step === "analyze" ? "#4f46e5" : step.step === "patch" ? "#7c3aed" : "#0ea5e9",
        border: "2px solid #0d0d1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px"
      }}>
        {step.step === "analyze" ? "🔍" : step.step === "patch" ? "🔧" : "⚡"}
      </div>

      <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "10px", marginBottom: "10px", overflow: "hidden" }}>
        <div
          onClick={() => setOpen(o => !o)}
          style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: "#64748b", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {step.step} · iter {step.iteration + 1}
            </span>
            {step.step === "analyze" && step.bug_category && (
              <span style={{ background: BUG_COLORS[step.bug_category] + "22", color: BUG_COLORS[step.bug_category], fontSize: "10px", padding: "2px 8px", borderRadius: "20px", border: `1px solid ${BUG_COLORS[step.bug_category]}44` }}>
                {step.bug_category}
              </span>
            )}
            {step.step === "analyze" && step.severity && (
              <span style={{ background: SEV_BG[step.severity], color: SEV_COLOR[step.severity], fontSize: "10px", padding: "2px 8px", borderRadius: "20px" }}>
                {step.severity}
              </span>
            )}
            {step.step === "execute" && (
              <span style={{ color: step.passed ? "#22c55e" : "#ef4444", fontSize: "12px", fontWeight: 600 }}>
                {step.passed ? "✅ passed" : "❌ failed"}
              </span>
            )}
          </div>
          <span style={{ color: "#374151", fontSize: "12px" }}>{open ? "▲" : "▼"}</span>
        </div>

        {open && (
          <div style={{ padding: "0 14px 14px", borderTop: "1px solid #1f2937" }}>
            {step.step === "analyze" && (
              <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", paddingTop: "12px" }}>
                <div style={{ flexShrink: 0 }}><ConfidenceRing value={step.confidence} /></div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div>
                    <div style={{ color: "#374151", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Root Cause</div>
                    <p style={{ color: "#f1f5f9", margin: 0, fontSize: "13px", lineHeight: "1.5" }}>{step.root_cause}</p>
                  </div>
                  <div>
                    <div style={{ color: "#374151", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Fix Plan</div>
                    <p style={{ color: "#94a3b8", margin: 0, fontSize: "12px", lineHeight: "1.5" }}>{step.fix_description}</p>
                  </div>
                </div>
              </div>
            )}

            {step.step === "patch" && step.fixed_code && (
              <div style={{ paddingTop: "12px" }}>
                <div style={{ color: "#374151", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Code Diff</div>
                <div style={{ borderRadius: "8px", overflow: "hidden", fontSize: "12px" }}>
                  <ReactDiffViewer oldValue={originalCode} newValue={step.fixed_code} splitView={false} useDarkTheme hideLineNumbers={false} />
                </div>
              </div>
            )}

            {step.step === "execute" && (
              <div style={{ paddingTop: "12px" }}>
                {(step.stdout || step.stderr) && (
                  <pre style={{ background: "#0d1117", padding: "10px 12px", borderRadius: "8px", color: step.passed ? "#86efac" : "#fca5a5", fontSize: "12px", margin: 0, overflow: "auto", maxHeight: "120px", fontFamily: "monospace" }}>
                    {step.stdout || step.stderr}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function FixTrail({ steps, originalCode, finalCode, status, totalIterations }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {steps.map((step, i) => (
        <StepCard key={i} step={step} originalCode={originalCode} isLast={i === steps.length - 1} />
      ))}

      {status === "solved" && finalCode && (
        <div style={{ background: "linear-gradient(135deg, #052e16, #0a1628)", border: "1px solid #166534", borderRadius: "10px", padding: "16px", marginTop: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#22c55e", fontSize: "16px" }}>✅</span>
              <span style={{ color: "#22c55e", fontWeight: 700, fontSize: "14px" }}>Fixed in {totalIterations} iteration{totalIterations !== 1 ? "s" : ""}</span>
            </div>
            {(() => {
  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(finalCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: copied ? "#14532d" : hovered ? "#15803d" : "#166534",
        color: copied ? "#86efac" : "#86efac",
        border: `1px solid ${copied ? "#22c55e" : hovered ? "#22c55e" : "#166534"}`,
        padding: "5px 14px", borderRadius: "6px", cursor: "pointer",
        fontSize: "12px", fontWeight: 600,
        transform: hovered && !copied ? "scale(1.04)" : "scale(1)",
        transition: "all 0.15s ease",
        display: "flex", alignItems: "center", gap: "6px",
        boxShadow: hovered ? "0 0 12px #22c55e44" : "none"
      }}
    >
      {copied ? "✅ Copied!" : "📋 Copy Fix"}
    </button>
  )
})()}
          </div>
          <pre style={{ background: "#0d1117", padding: "12px", borderRadius: "8px", color: "#e2e8f0", fontSize: "12px", margin: 0, overflow: "auto", maxHeight: "180px", fontFamily: "monospace" }}>
            {finalCode}
          </pre>
        </div>
      )}

      {status === "max_iterations_reached" && (
        <div style={{ background: "#1c1203", border: "1px solid #92400e", borderRadius: "10px", padding: "14px", color: "#fbbf24", fontSize: "13px", marginTop: "4px" }}>
          ⚠️ Max iterations reached (5). Showing best attempt above.
        </div>
      )}
    </div>
  )
}