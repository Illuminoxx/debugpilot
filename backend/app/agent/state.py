from typing import TypedDict

class AgentState(TypedDict):
    code: str
    language: str
    error: str
    iteration: int
    max_iterations: int
    patches: list
    execution_results: list
    status: str
    final_code: str
    root_cause: str
    review: dict