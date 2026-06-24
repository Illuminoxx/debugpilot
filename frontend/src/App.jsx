import { useState, useEffect, useCallback } from "react"
import { useDispatch, useSelector } from "react-redux"
import { startDebug, addStep, setReview, setDone, addQuery, reset } from "./store/debugSlice"
import CodeEditor from "./components/CodeEditor"
import FixTrail from "./components/FixTrail"
import ReviewPanel from "./components/ReviewPanel"
import History from "./components/History"
import SplashScreen from "./components/SplashScreen"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const LANGUAGES = [
  { id: "python",     label: "Python",     icon: "🐍" },
  { id: "javascript", label: "JavaScript", icon: "🟨" },
  { id: "typescript", label: "TypeScript", icon: "🔷" },
  { id: "java",       label: "Java",       icon: "☕" },
  { id: "c",          label: "C",          icon: "⚙️" },
  { id: "cpp",        label: "C++",        icon: "🔩" },
  { id: "php",        label: "PHP",        icon: "🐘" },
  { id: "ruby",       label: "Ruby",       icon: "💎" },
]

const SAMPLES = {
  python:     { code: `def divide(a, b):\n    return a / b\n\nresult = divide(10, 0)\nprint(result)`},
  javascript: { code: `function getUser(users, id) {\n    return users.find(u => u.id === id).name;\n}\nconst users = [{id: 1, name: "Alice"}];\nconsole.log(getUser(users, 2));` },
  typescript: { code: `function greet(name: string): string {\n    return "Hello " + nme;\n}\nconsole.log(greet("World"));`, error: `Cannot find name 'nme'` },
  java:       { code: `public class Main {\n    public static void main(String[] args) {\n        int[] arr = {1, 2, 3};\n        System.out.println(arr[5]);\n    }\n}` },
  c:          { code: `#include <stdio.h>\nint main() {\n    int arr[3] = {1, 2, 3};\n    printf("%d\\n", arr[10]);\n    return 0;\n}`},
  cpp:        { code: `#include <iostream>\n#include <vector>\nint main() {\n    std::vector<int> v = {1, 2, 3};\n    std::cout << v.at(10) << std::endl;\n    return 0;\n}`},
  php:        { code: `<?php\n$arr = [1, 2, 3];\necho $arr[10];\n?>` },
  ruby:       { code: `def divide(a, b)\n  a / b\nend\nputs divide(10, 0)` },
}

const PANEL_TABS = ["trail", "review"]

export default function App() {
  const dispatch = useDispatch()
  const { steps, status, finalCode, originalCode, totalIterations, sessionId, review, queryHistory } = useSelector(s => s.debug)

  const [language, setLanguage] = useState("python")
  const [code, setCode] = useState(SAMPLES.python.code)
  const [error, setError] = useState(SAMPLES.python.error)
  const [tab, setTab] = useState("debug")
  const [rightTab, setRightTab] = useState("trail")
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [sessions, setSessions] = useState({ total: 0, solved: 0, languages: 0, avgIter: "—" })

  const currentLang = LANGUAGES.find(l => l.id === language) || LANGUAGES[0]
  const [showSplash, setShowSplash] = useState(true)

  function handleLanguageChange(lang) {
    setLanguage(lang)
    setCode(SAMPLES[lang]?.code || "")
    setError(SAMPLES[lang]?.error || "")
    dispatch(reset())
    setLangMenuOpen(false)
  }

  async function handleDebug() {
    if (!code.trim() || !error.trim() || loading) return
    setLoadError("")
    setRightTab("trail")
    dispatch(startDebug(code))
    setLoading(true)

    try {
      const response = await fetch(`${API}/debug`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, error, language })
      })
      if (!response.ok) throw new Error(`Server error ${response.status}`)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop()
        for (const line of lines) {
          if (!line.trim().startsWith("data: ")) continue
          try {
            const data = JSON.parse(line.trim().slice(6))
            if (data.step === "done") {
              dispatch(setDone(data))
              setRightTab("trail")
            } else if (data.step === "review") {
              dispatch(setReview(data.review))
              setTimeout(() => setRightTab("review"), 600)
            } else if (data.step === "error") {
              setLoadError(data.message)
            } else {
              dispatch(addStep(data))
            }
          } catch {}
        }
      }
    } catch (e) {
      setLoadError(e.message || "Connection failed. Is backend running?")
      dispatch(reset())
    } finally {
      setLoading(false)
    }
  }

  // ── Ctrl+Enter shortcut ──────────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      handleDebug()
    }
  }, [code, error, loading])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
  // ────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`${API}/history`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return
        const solved = data.filter(s => s.status === "solved").length
        const langs = new Set(data.map(s => s.language)).size
        const avgIter = data.length
          ? (data.reduce((a, s) => a + (s.iterations_taken || 1), 0) / data.length).toFixed(1)
          : "—"
        setSessions({ total: data.length, solved, languages: langs, avgIter })
      })
      .catch(() => {})

      
  }, [status])

useEffect(() => {
  let interval = null
  let rafId = null
  let returning = false

  function flyAround() {
    const el = document.getElementById("flying-bot")
    if (!el) return

    returning = false
    el.style.transition = ""
    el.style.display = "block"

    const maxX = window.innerWidth - 30
    const maxY = window.innerHeight - 30
    const speed = 4

    let x = 28, y = 14
    let dx = speed, dy = 0
    let wall = 0

    const walls = [
      () => { x += speed; if (x >= maxX) { x = maxX; wall = 1 } },
      () => { y += speed; if (y >= maxY) { y = maxY; wall = 2 } },
      () => { x -= speed; if (x <= 0)    { x = 0;    wall = 3 } },
      () => { y -= speed; if (y <= 14)   { y = 14;   wall = 4 } },
    ]

    let currentWall = 0
    let done = false

    const move = () => {
      if (done) return

      walls[currentWall]()
      el.style.left = x + "px"
      el.style.top  = y + "px"

      const prevWall = currentWall
      if (currentWall === 0 && x >= maxX) currentWall = 1
      else if (currentWall === 1 && y >= maxY) currentWall = 2
      else if (currentWall === 2 && x <= 0)    currentWall = 3
      else if (currentWall === 3 && y <= 14) {
        done = true
        el.style.transition = "left 1.2s cubic-bezier(0.4,0,0.2,1), top 1.2s cubic-bezier(0.4,0,0.2,1)"
        el.style.left = "28px"
        el.style.top  = "14px"
        setTimeout(() => {
          el.style.display = "none"
          el.style.transition = ""
        }, 1300)
        return
      }

      rafId = setTimeout(move, 1000 / 60)
    }

    move()
  }

  flyAround()
  interval = setInterval(flyAround, 120000)

  return () => {
    clearInterval(interval)
    clearTimeout(rafId)
  }
}, [])

  function loadSession(id) {
    fetch(`${API}/history/${id}`)
      .then(r => r.json())
      .then(s => {
        if (s.error) return
        setCode(s.original_code)
        setError(s.original_error)
        setLanguage(s.language)
        setTab("debug")
        dispatch(reset())
      })
      .catch(() => {})
  }

  const hasResults = steps.length > 0 || status !== "idle"


   return (
  <>
    {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
    <div style={{ minHeight: "100vh", background: "#000000", color: "#e2e8f0", fontFamily: "'Inter', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>

      <header style={{ borderBottom: "1px solid #0f172a", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "52px", background: "#000000", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
  style={{
    width: "28px", height: "28px",
    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
    borderRadius: "7px", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: "14px",
    animation: "logoFloat 3s ease-in-out infinite",
    cursor: "pointer", position: "relative"
  }}
  onMouseEnter={e => e.currentTarget.style.animation = "logoSpin 0.5s ease-in-out"}
  onMouseLeave={e => e.currentTarget.style.animation = "logoFloat 3s ease-in-out infinite"}
>
  🤖
  <span id="flying-bot" style={{
    position: "fixed", fontSize: "18px", pointerEvents: "none",
    display: "none", zIndex: 9999, transition: "all 0.1s linear"
  }}>🤖</span>
</div>
          <span style={{ fontWeight: 800, fontSize: "16px", letterSpacing: "-0.03em" }}>
            Debug<span style={{ background: "linear-gradient(90deg, #818cf8, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Agent</span>
          </span>
          <div style={{ width: "1px", height: "16px", background: "#000000" }} />
          <span style={{ color: "#374151", fontSize: "11px", letterSpacing: "0.05em" }} className="hide-mobile">POWERED BY GROQ + LLAMA 3.3</span>
        </div>

        <div style={{ display: "flex", gap: "2px", background: "#000000", padding: "3px", borderRadius: "8px" }}>
          {["debug", "history"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? "#1e293b" : "transparent",
              color: tab === t ? "#e2e8f0" : "#475569",
              border: "none", padding: "5px 16px", borderRadius: "6px",
              cursor: "pointer", fontSize: "12px", fontWeight: 600, textTransform: "capitalize"
            }}>{t}</button>
          ))}
        </div>
      </header>

      <div style={{
        borderBottom: "1px solid #0f172a",
        padding: "8px 58px",
        display: "flex",
        alignItems: "center",
        gap: "145px",
        background: "#000000",
        overflowX: "auto",
      }}>
        {[
          { label: "Sessions", value: sessions.total },
          { label: "Bugs Fixed", value: sessions.solved },
          { label: "Languages", value: sessions.languages },
          { label: "Avg Iterations", value: sessions.avgIter },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <span style={{ color: "#1e3a5f", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</span>
            <span style={{ color: "#4f46e5", fontWeight: 700, fontSize: "13px", fontFamily: "monospace" }}>{s.value ?? "—"}</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", animation: "pulse 2s ease-in-out infinite" }} />
          <span style={{ color: "#14532d", fontSize: "11px" }}>live</span>
        </div>
      </div>

      <main style={{ flex: 1, maxWidth: "1400px", width: "100%", margin: "0 auto", padding: "20px 28px", boxSizing: "border-box" }}>
        {tab === "history" ? (
          <History onLoadSession={loadSession} apiUrl={API} />
        ) : (
          <div className="main-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "start" }}>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ background: "#0d1117", border: "1px solid #161b22", borderRadius: "12px", overflow: "hidden", flexShrink: 0 }}>
                <div style={{ padding: "10px 14px", background: "#0d1117", borderBottom: "1px solid #161b22", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ display: "flex", gap: "5px" }}>
                      {["#ff5f57","#febc2e","#28c840"].map((c,i) => <div key={i} style={{ width: "10px", height: "10px", borderRadius: "50%", background: c }} />)}
                    </div>
                    <span style={{ color: "#374151", fontSize: "12px", fontFamily: "monospace" }}>editor.{currentLang.id === "csharp" ? "cs" : currentLang.id === "cpp" ? "cpp" : currentLang.id}</span>
                  </div>

                  <div style={{ position: "relative" }}>
                    <button onClick={() => setLangMenuOpen(o => !o)} style={{
                      background: "#161b22", color: "#94a3b8", border: "1px solid #21262d",
                      padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px",
                      display: "flex", alignItems: "center", gap: "6px"
                    }}>
                      <span>{currentLang.icon}</span>
                      <span>{currentLang.label}</span>
                      <span style={{ color: "#374151" }}>▾</span>
                    </button>
                    {langMenuOpen && (
                      <div style={{
                        position: "absolute", right: 0, top: "calc(100% + 4px)", background: "#161b22",
                        border: "1px solid #21262d", borderRadius: "8px", zIndex: 50, padding: "4px",
                        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px", width: "220px"
                      }}>
                        {LANGUAGES.map(l => (
                          <button key={l.id} onClick={() => handleLanguageChange(l.id)} style={{
                            background: l.id === language ? "#1f2937" : "transparent",
                            color: l.id === language ? "#e2e8f0" : "#64748b",
                            border: "none", padding: "7px 10px", borderRadius: "6px", cursor: "pointer",
                            fontSize: "12px", textAlign: "left", display: "flex", alignItems: "center", gap: "6px"
                          }}>
                            <span>{l.icon}</span><span>{l.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <CodeEditor value={code} onChange={setCode} language={language} />
              </div>

              <div style={{ background: "#0d1117", border: "1px solid #161b22", borderRadius: "12px", overflow: "hidden", flexShrink: 0 }}>
                <div style={{ padding: "8px 14px", background: "#0d1117", borderBottom: "1px solid #161b22", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#ef4444", fontSize: "12px" }}>✕</span>
                  <span style={{ color: "#374151", fontSize: "12px", fontFamily: "monospace" }}>stderr / error</span>
                </div>
                <textarea
                  value={error}
                  onChange={e => setError(e.target.value)}
                  placeholder="Paste your error message or traceback here..."
                  style={{
                    width: "100%", height: "75px", background: "#0d1117", color: "#fca5a5",
                    border: "none", padding: "12px 14px", fontSize: "12px", resize: "none",
                    fontFamily: "'JetBrains Mono','Fira Code',monospace", boxSizing: "border-box", outline: "none"
                  }}
                />
              </div>

              {loadError && (
                <div style={{ background: "#2d0a0a", border: "1px solid #7f1d1d", borderRadius: "8px", padding: "10px 14px", color: "#fca5a5", fontSize: "13px" }}>
                  ❌ {loadError}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={handleDebug} disabled={loading || !code.trim()} style={{
                  flex: 1, padding: "12px",
                  background: loading ? "linear-gradient(135deg, #4f4a20, #5d2913)" : "linear-gradient(135deg, #1e2742, #0d5247)",
                  color: "#fff", border: "none", borderRadius: "10px",
                  cursor: loading ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                  opacity: !code.trim() ? 0.4 : 1,
                  boxShadow: loading ? "none" : "0 4px 24px #5b682733"
                }}>
                  {loading ? (
                    <>
                      <span style={{ width: "14px", height: "14px", border: "2px solid #2a401b", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                      Agent running...
                    </>
                  ) : (
                    <>
                      Debug It 🔧
                      <span style={{ fontSize: "10px", color: "#4a6a5a", marginLeft: "4px", fontWeight: 400, letterSpacing: "0.02em" }}>Ctrl+↵</span>
                    </>
                  )}
                </button>
                {hasResults && (
                  <button onClick={() => { dispatch(reset()); setLoadError("") }} style={{
                    background: "#0d1117", color: "#475569", border: "1px solid #161b22",
                    padding: "12px 16px", borderRadius: "10px", cursor: "pointer", fontSize: "13px"
                  }}>Clear</button>
                )}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: "#0d1117", border: "1px solid #161b22", borderRadius: "12px" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #161b22", display: "flex", gap: "4px", flexShrink: 0 }}>
                {PANEL_TABS.map(t => (
                  <button key={t} onClick={() => setRightTab(t)} disabled={t === "review" && !review} style={{
                    padding: "5px 14px", borderRadius: "6px", border: "none", cursor: (t === "review" && !review) ? "default" : "pointer",
                    background: rightTab === t ? "#1e293b" : "transparent",
                    color: rightTab === t ? "#e2e8f0" : (t === "review" && !review) ? "#1f2937" : "#475569",
                    fontSize: "12px", fontWeight: 600, textTransform: "capitalize"
                  }}>
                    {t === "trail" ? "Fix Trail" : `Code Review ${review ? `· ${review.overall_score}/100` : ""}`}
                  </button>
                ))}
                {loading && (
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px", color: "#4f46e5", fontSize: "11px" }}>
                    <span style={{ width: "8px", height: "8px", background: "#4f46e5", borderRadius: "50%", animation: "pulse 1s ease-in-out infinite" }} />
                    analyzing
                  </div>
                )}
              </div>

              <div style={{ flex: 1, overflow: "auto", padding: "14px" }}>
                {rightTab === "trail" && (
                  !hasResults ? (
                   <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px" }}>
  <div style={{ width: "72px", height: "72px", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", boxShadow: "0 0 40px #4f46e544" }}>🔍</div>
  <div style={{ textAlign: "center" }}>
    <p style={{ color: "#94a3b8", margin: "0 0 6px", fontSize: "16px", fontWeight: 700 }}>No debug session yet</p>
    <p style={{ color: "#475569", margin: 0, fontSize: "13px" }}>Paste broken code then hit Debug It</p>
  </div>
  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
    {[
      { label: "Identifies root cause", icon: "🔍" },
      { label: "Patches code", icon: "🔧" },
      { label: "Verifies fix", icon: "⚡" },
      { label: "Reviews quality", icon: "📋" }
    ].map(f => (
      <span key={f.label} style={{ background: "#0f172a", border: "1px solid #1e293b", color: "#64748b", fontSize: "12px", padding: "6px 12px", borderRadius: "20px", display: "flex", alignItems: "center", gap: "6px" }}>
        <span>{f.icon}</span><span>{f.label}</span>
      </span>
    ))}
  </div>
  <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", maxWidth: "280px" }}>
    {[
      { step: "01", text: "Paste your broken code in the editor" },
      { step: "02", text: "Add error message or leave blank" },
      { step: "03", text: "Hit Debug It and watch the agent work" },
    ].map(s => (
      <div key={s.step} style={{ display: "flex", alignItems: "center", gap: "12px", background: "#0a0a0a", border: "1px solid #1e293b", borderRadius: "8px", padding: "10px 12px" }}>
        <span style={{ color: "#4f46e5", fontWeight: 800, fontSize: "12px", fontFamily: "monospace", flexShrink: 0 }}>{s.step}</span>
        <span style={{ color: "#475569", fontSize: "12px" }}>{s.text}</span>
      </div>
    ))}
  </div>
</div>
                  ) : (
                    <FixTrail steps={steps} originalCode={originalCode} finalCode={finalCode} status={status} totalIterations={totalIterations} />
                  )
                )}

                {rightTab === "review" && review && (
                  <ReviewPanel
                    review={review}
                    sessionId={sessionId}
                    onQuery={msg => dispatch(addQuery(msg))}
                    queryHistory={queryHistory}
                    apiUrl={API}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
        @keyframes bounce { 0%,80%,100% { transform:scale(0) } 40% { transform:scale(1) } }
        @keyframes logoFloat {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  25% { transform: translateY(-3px) rotate(-5deg); }
  75% { transform: translateY(3px) rotate(5deg); }
}
@keyframes logoSpin {
  0% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.2) rotate(180deg); }
  100% { transform: scale(1) rotate(360deg); }
}
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
        textarea:focus { outline: none; }
        input:focus { outline: 1px solid #4f46e5 !important; }

        /* ── Responsive ───────────────────────────────────────────── */
        @media (max-width: 768px) {
          .main-grid {
            grid-template-columns: 1fr !important;
          }
          .hide-mobile {
            display: none !important;
          }
        }
      `}</style>
 </div>
  </>
  )
}