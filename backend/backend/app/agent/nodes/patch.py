import os
from groq import Groq
from app.agent.state import AgentState

def patch_node(state: AgentState) -> AgentState:
    client = Groq(api_key=os.environ["GROQ_API_KEY"])
    analysis = state["patches"][-1]["analysis"]

    failed_approaches = ""
    if len(state["patches"]) > 1:
        failed_approaches = "\n\nApproaches that already FAILED — do not use these:\n"
        for p in state["patches"][:-1]:
            failed_approaches += f"- {p['analysis'].get('fix_description', '')}\n"

    prompt = f"""You are an expert {state["language"]} developer. Fix the broken code.

Root cause: {analysis["root_cause"]}
Fix required: {analysis["fix_description"]}
Bug category: {analysis.get("bug_category", "Other")}
{failed_approaches}

Broken Code:
{state["code"]}

Error:
{state["error"]}

Rules:
- Return ONLY raw executable code, nothing else
- No markdown fences, no explanation, no inline comments
- Fix ONLY what is broken, preserve everything else exactly
- The fixed code must be fully runnable as-is"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.05,
        max_tokens=2000
    )

    fixed_code = response.choices[0].message.content.strip()
    if fixed_code.startswith("```"):
        lines = fixed_code.split("\n")
        end_idx = next((i for i in range(len(lines) - 1, 0, -1) if lines[i].strip() == "```"), len(lines))
        fixed_code = "\n".join(lines[1:end_idx])

    state["patches"][-1]["fixed_code"] = fixed_code
    state["final_code"] = fixed_code
    return state