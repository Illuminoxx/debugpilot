import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { startDebug, addStep, setReview, setDone, addQuery, reset } from "./store/debugSlice"
import CodeEditor from "./components/CodeEditor"
import FixTrail from "./components/FixTrail"
import ReviewPanel from "./components/ReviewPanel"
import History from "./components/History"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const LANGUAGES = [
  { id: "python",     label: "Python",     icon: "🐍" },
  { id: "javascript", label: "JavaScript", icon: "🟨" },
  { id: "typescript", label: "TypeScript", icon: "🔷" },
  { id: "java",       label: "Java",       icon: "☕" },
  { id: "c",          label: "C",          icon: "⚙️" },
  { id: "cpp",        label: "C++",        icon: "🔩" },
  { id: "csharp",     label: "C#",         icon: "💜" },
  { id: "go",         label: "Go",         icon: "🐹" },
  { id: "rust",       label: "Rust",       icon: "🦀" },
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
  csharp:     { code: `using System;\nclass Program {\n    static void Main() {\n        string s = null;\n        Console.WriteLine(s.Length);\n    }\n}` },
  go:         { code: `package main\nimport "fmt"\nfunc divide(a, b int) int {\n    return a / b\n}\nfunc main() {\n    fmt.Println(divide(10, 0))\n}` },
  rust:       { code: `fn main() {\n    let v = vec![1, 2, 3];\n    println!("{}", v[10]);\n}`, },
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

  const currentLang = LANGUAGES.find(l => l.id === language) || LANGUAGES[0]

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
    <div style={{ minHeight: "100vh", background: "#080b14", color: "#e2e8f0", fontFamily: "'Inter', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>

      <header style={{ borderBottom: "1px solid #0f172a", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "52px", background: "#080b14", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "28px", height: "28px", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>🤖</div>
          <span style={{ fontWeight: 800, fontSize: "16px", letterSpacing: "-0.03em" }}>
            Debug<span style={{ background: "linear-gradient(90deg, #818cf8, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Agent</span>
          </span>
          <div style={{ width: "1px", height: "16px", background: "#1e293b" }} />
          <span style={{ color: "#374151", fontSize: "11px", letterSpacing: "0.05em" }}>POWERED BY GROQ + LLAMA 3.3</span>
        </div>

        <div style={{ display: "flex", gap: "2px", background: "#0f172a", padding: "3px", borderRadius: "8px" }}>
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

      <main style={{ flex: 1, maxWidth: "1400px", width: "100%", margin: "0 auto", padding: "20px 28px", boxSizing: "border-box" }}>
        {tab === "history" ? (
          <History onLoadSession={loadSession} apiUrl={API} />
        ) : (
          <div style={{ display: "grid",gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "start" }}>

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
                  background: loading ? "linear-gradient(135deg, #312e81, #3730a3)" : "linear-gradient(135deg, #4f46e5, #7c3aed)",
                  color: "#fff", border: "none", borderRadius: "10px",
                  cursor: loading ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                 opacity: !code.trim() ? 0.4 : 1,
                  boxShadow: loading ? "none" : "0 4px 24px #4f46e533"
                }}>
                  {loading ? (
                    <>
                      <span style={{ width: "14px", height: "14px", border: "2px solid #818cf8", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                      Agent running...
                    </>
                  ) : <>⚡ Debug It</>}
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
                    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
                      <div style={{ width: "64px", height: "64px", background: "linear-gradient(135deg, #1e1b4b, #0f0e2a)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", border: "1px solid #1f2937" }}>🔍</div>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ color: "#1f2937", margin: "0 0 6px", fontSize: "15px", fontWeight: 600 }}>No debug session yet</p>
                        <p style={{ color: "#0f172a", margin: 0, fontSize: "13px" }}>Paste broken code + error, then hit Debug It</p>
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
                        {["Identifies root cause", "Patches code", "Verifies fix", "Reviews quality"].map(f => (
                          <span key={f} style={{ background: "#0f172a", border: "1px solid #1e293b", color: "#1e3a5f", fontSize: "11px", padding: "4px 10px", borderRadius: "20px" }}>{f}</span>
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
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
        textarea:focus { outline: none; }
        input:focus { outline: 1px solid #4f46e5 !important; }
      `}</style>
    </div>
  )
}