import json
import asyncio
import uuid
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from app.agent.graph import agent
from app.agent.nodes.query import answer_query_node
from app.db.models import init_db, get_db, DebugSession

load_dotenv()
init_db()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_session_states = {}

class DebugRequest(BaseModel):
    code: str
    error: str = ""
    language: str

class QueryRequest(BaseModel):
    session_id: str
    query: str

@app.post("/debug")
async def debug_code(req: DebugRequest, db: Session = Depends(get_db)):
    initial_state = {
        "code": req.code,
        "language": req.language,
        "error": req.error,
        "iteration": 0,
        "max_iterations": 5,
        "patches": [],
        "execution_results": [],
        "status": "running",
        "final_code": "",
        "root_cause": "",
        "review": {}
    }

    async def stream():
        loop = asyncio.get_event_loop()
        final_state = initial_state.copy()

        def run_agent():
            collected = []
            for event in agent.stream(initial_state):
                collected.append(event)
            return collected

        try:
            events = await loop.run_in_executor(None, run_agent)
        except Exception as e:
            yield f"data: {json.dumps({'step': 'error', 'message': str(e)})}\n\n"
            return

        for event in events:
            node_name = list(event.keys())[0]
            state = event[node_name]
            final_state = state

            if node_name == "analyze" and state.get("patches"):
                analysis = state["patches"][-1].get("analysis", {})
                yield f"data: {json.dumps({'step': 'analyze', 'iteration': state['iteration'], 'root_cause': analysis.get('root_cause', ''), 'fix_description': analysis.get('fix_description', ''), 'confidence': analysis.get('confidence', 50), 'bug_category': analysis.get('bug_category', 'Other'), 'severity': analysis.get('severity', 'medium')})}\n\n"

            elif node_name == "patch" and state.get("patches"):
                patch = state["patches"][-1]
                yield f"data: {json.dumps({'step': 'patch', 'iteration': state['iteration'], 'fixed_code': patch.get('fixed_code', '')})}\n\n"

            elif node_name == "execute" and state.get("execution_results"):
                result = state["execution_results"][-1]
                yield f"data: {json.dumps({'step': 'execute', 'iteration': state['iteration'], 'passed': result.get('passed', False), 'stdout': result.get('stdout', ''), 'stderr': result.get('stderr', ''), 'status': state['status']})}\n\n"

            elif node_name == "review" and state.get("review"):
                yield f"data: {json.dumps({'step': 'review', 'review': state['review']})}\n\n"

            await asyncio.sleep(0)

        session_id = str(uuid.uuid4())
        _session_states[session_id] = final_state

        try:
            session = DebugSession(
                id=session_id,
                language=req.language,
                original_code=req.code,
                original_error=req.error,
                final_code=final_state.get("final_code", ""),
                iterations_taken=final_state.get("iteration", 0) + 1,
                status=final_state.get("status", "unknown"),
                root_cause=final_state.get("root_cause", "")
            )
            db.add(session)
            db.commit()
        except Exception:
            pass

        yield f"data: {json.dumps({'step': 'done', 'status': final_state.get('status', 'unknown'), 'final_code': final_state.get('final_code', ''), 'total_iterations': final_state.get('iteration', 0) + 1, 'session_id': session_id})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@app.post("/query")
async def ask_query(req: QueryRequest):
    state = _session_states.get(req.session_id)
    if not state:
        sessions_fallback = {"code": "", "language": "python", "final_code": "", "review": {}}
        state = sessions_fallback
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, answer_query_node, state, req.query)
    return result

@app.get("/history")
def get_history(db: Session = Depends(get_db)):
    sessions = db.query(DebugSession).order_by(DebugSession.created_at.desc()).limit(20).all()
    return [{"id": s.id, "language": s.language, "status": s.status, "iterations_taken": s.iterations_taken, "root_cause": s.root_cause, "created_at": s.created_at.isoformat(), "original_error": (s.original_error or "")[:120]} for s in sessions]

@app.get("/history/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    s = db.query(DebugSession).filter(DebugSession.id == session_id).first()
    if not s:
        return {"error": "Not found"}
    return {"id": s.id, "language": s.language, "original_code": s.original_code, "original_error": s.original_error, "final_code": s.final_code, "status": s.status, "iterations_taken": s.iterations_taken, "root_cause": s.root_cause, "created_at": s.created_at.isoformat()}

@app.get("/")
def root():
    return {"status": "ok", "service": "Autonomous Debug Agent"}