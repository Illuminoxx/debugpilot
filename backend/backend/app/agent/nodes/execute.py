from app.agent.state import AgentState
from app.sandbox.runner import execute_code

def execute_node(state: AgentState) -> AgentState:
    fixed_code = state["final_code"]
    result = execute_code(fixed_code, state["language"])

    state["execution_results"].append({
        "iteration": state["iteration"],
        "code": fixed_code,
        "stdout": result["stdout"],
        "stderr": result["stderr"],
        "passed": result["passed"]
    })

    if result["passed"]:
        state["status"] = "solved"
    else:
        state["iteration"] += 1
        state["code"] = fixed_code
        state["error"] = result["stderr"] or result["stdout"]
        if state["iteration"] >= state["max_iterations"]:
            state["status"] = "max_iterations_reached"
        else:
            state["status"] = "retrying"

    return state