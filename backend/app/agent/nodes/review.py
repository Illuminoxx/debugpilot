import os
import json
from groq import Groq
from app.agent.state import AgentState

def review_node(state: AgentState) -> AgentState:
    client = Groq(api_key=os.environ["GROQ_API_KEY"])
    code_to_review = state.get("final_code") or state["code"]

    prompt = f"""You are a senior {state["language"]} engineer doing a thorough code review.

Code to review:
{code_to_review}

Provide a comprehensive code review. Be specific, actionable, and reference actual line patterns.

Respond ONLY with this exact JSON, no text outside:
{{
  "overall_score": <integer 1-100>,
  "summary": "2-3 sentence overall assessment",
  "issues": [
    {{
      "type": "<one of: performance, security, readability, maintainability, best_practice, potential_bug>",
      "severity": "<critical|high|medium|low|info>",
      "title": "short issue title",
      "description": "detailed explanation of the issue",
      "suggestion": "concrete fix or improvement"
    }}
  ],
  "strengths": ["what the code does well - list 2-3 items"],
  "suggested_queries": [
    "A relevant follow-up question the developer might ask",
    "Another insightful question about this code",
    "A question about optimization or alternatives"
  ]
}}"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_tokens=1500
    )

    raw = response.choices[0].message.content.strip()
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        result = json.loads(raw[start:end])
    except Exception:
        result = {
            "overall_score": 70,
            "summary": "Code review could not be fully parsed.",
            "issues": [],
            "strengths": [],
            "suggested_queries": []
        }

    state["review"] = result
    return state