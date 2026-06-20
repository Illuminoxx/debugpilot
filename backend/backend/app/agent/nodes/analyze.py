import os
import json
from groq import Groq
from app.agent.state import AgentState

def analyze_node(state: AgentState) -> AgentState:
    client = Groq(api_key=os.environ["GROQ_API_KEY"])

    history = ""
    if state["patches"]:
        history = "\n\nPrevious fix attempts that FAILED — do not repeat these approaches:\n"
        for i, p in enumerate(state["patches"]):
            history += f"Attempt {i+1} code:\n{p.get('fixed_code', p['code'])}\nNew error:\n{p['error']}\n\n"

    prompt = f"""You are a world-class {state["language"]} debugger and code analyst.

Language: {state["language"]}

Broken Code:
{state["code"]}

Error/Issue:
{state["error"] if state["error"].strip() else "No error message provided. Analyze the code for bugs, logic errors, and potential runtime issues on your own."}
{history}

Analyze deeply. Your confidence score must reflect genuine certainty:
- 95-100: You are absolutely certain of the root cause
- 80-94: Very likely correct, minor uncertainty
- 60-79: Probable cause, some ambiguity
- 40-59: Multiple possible causes, best guess
- Below 40: Highly ambiguous, need more context

Respond ONLY with this exact JSON, no text outside it:
{{
  "root_cause": "precise one-sentence description of the exact bug",
  "fix_description": "step-by-step explanation of what needs to change and why",
  "confidence": <integer 1-100 reflecting true certainty>,
  "bug_category": "<one of: NullReference, IndexOutOfBounds, TypeMismatch, LogicError, SyntaxError, DivisionByZero, MemoryError, ConcurrencyError, ImportError, NetworkError, Other>",
  "severity": "<one of: critical, high, medium, low>"
}}"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=600
    )

    raw = response.choices[0].message.content.strip()
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        result = json.loads(raw[start:end])
    except Exception:
        result = {
            "root_cause": "Could not parse analysis",
            "fix_description": raw,
            "confidence": 45,
            "bug_category": "Other",
            "severity": "medium"
        }

    state["root_cause"] = result.get("root_cause", "")
    state["patches"].append({
        "analysis": result,
        "code": state["code"],
        "error": state["error"]
    })
    return state