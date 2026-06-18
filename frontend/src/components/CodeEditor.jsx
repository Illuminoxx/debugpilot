import { useEffect, useRef } from "react"
import { EditorView, keymap, highlightActiveLine, lineNumbers, highlightActiveLineGutter, drawSelection, dropCursor, rectangularSelection, crosshairCursor } from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands"
import { indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentUnit } from "@codemirror/language"
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from "@codemirror/autocomplete"
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search"
import { python } from "@codemirror/lang-python"
import { javascript } from "@codemirror/lang-javascript"
import { java } from "@codemirror/lang-java"
import { oneDark } from "@codemirror/theme-one-dark"

const langMap = {
  python:     () => python(),
  javascript: () => javascript(),
  typescript: () => javascript({ typescript: true }),
  java:       () => java(),
  c:          () => javascript(),
  cpp:        () => javascript(),
  csharp:     () => javascript(),
  go:         () => javascript(),
  rust:       () => javascript(),
  php:        () => javascript(),
  ruby:       () => javascript(),
}

function buildExtensions(language, readOnly, onChange) {
  const lang = (langMap[language] || langMap.python)()
  const base = [
    lineNumbers(),
    highlightActiveLineGutter(),
    history(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...completionKeymap,
      indentWithTab
    ]),
    indentUnit.of("    "),
    oneDark,
    lang,
    EditorView.theme({
     "&": { height: readOnly ? "auto" : "220px", maxHeight: readOnly ? "200px" : "220px" },
      ".cm-scroller": { overflow: "auto", fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: "13px", lineHeight: "1.6" },
      ".cm-content": { padding: "10px 0" },
      ".cm-focused": { outline: "none" },
      ".cm-gutters": { background: "#0d1117", borderRight: "1px solid #161b22" },
      ".cm-lineNumbers": { color: "#374151" },
    })
  ]

  if (readOnly) {
    base.push(EditorState.readOnly.of(true))
  } else {
    base.push(EditorView.updateListener.of(u => {
      if (u.docChanged) onChange(u.state.doc.toString())
    }))
  }

  return base
}

export default function CodeEditor({ value, onChange, language, readOnly = false }) {
  const containerRef = useRef(null)
  const viewRef = useRef(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!containerRef.current) return

    const extensions = buildExtensions(language, readOnly, (v) => onChangeRef.current(v))
    const state = EditorState.create({ doc: value, extensions })

    if (viewRef.current) viewRef.current.destroy()
    viewRef.current = new EditorView({ state, parent: containerRef.current })

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }
    }
  }, [language, readOnly])

  return <div ref={containerRef} style={{ borderRadius: "0 0 10px 10px", overflow: "hidden" }} />
}