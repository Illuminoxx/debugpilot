import os
from groq import Groq
from app.agent.state import AgentState

def answer_query_node(state: AgentState, query: str) -> dict:
    client = Groq(api_key=os.environ["GROQ_API_KEY"])

    context_code = state.get("final_code") or state.get("code", "")
    review_context = ""
    if state.get("review"):
        review_context = f"\nCode review score: {state['review'].get('overall_score', 'N/A')}/100\nKey issues found: {[i['title'] for i in state['review'].get('issues', [])]}"

    prompt = f"""You are an expert {state.get("language", "programming")} developer and code mentor.

Code context:
{context_code}
{review_context}

Developer question: {query}

Give a clear, expert answer. Be direct and practical. Include code examples if relevant.
Keep your response focused and under 300 words."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_tokens=800
    )

    return {"answer": response.choices[0].message.content.strip()}
