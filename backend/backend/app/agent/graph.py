from langgraph.graph import StateGraph, END
from app.agent.state import AgentState
from app.agent.nodes.analyze import analyze_node
from app.agent.nodes.patch import patch_node
from app.agent.nodes.execute import execute_node
from app.agent.nodes.review import review_node

def should_continue(state: AgentState) -> str:
    if state["status"] == "solved":
        return "review"
    if state["status"] == "max_iterations_reached":
        return "review"
    return "retry"

def build_graph():
    graph = StateGraph(AgentState)
    graph.add_node("analyze", analyze_node)
    graph.add_node("patch", patch_node)
    graph.add_node("execute", execute_node)
    graph.add_node("review", review_node)
    graph.set_entry_point("analyze")
    graph.add_edge("analyze", "patch")
    graph.add_edge("patch", "execute")
    graph.add_conditional_edges("execute", should_continue, {
        "retry": "analyze",
        "review": "review",
    })
    graph.add_edge("review", END)
    return graph.compile()

agent = build_graph()