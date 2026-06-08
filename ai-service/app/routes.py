from flask import Blueprint, jsonify, request

from .auth import require_service_token
from .chains import answer_question, create_task_plan
from .rag import replace_workspace_documents

api = Blueprint("api", __name__)


def _sources(documents):
    return [
        {
            "type": document.metadata.get("type"),
            "label": document.metadata.get("label"),
            "sourceId": document.metadata.get("source_id"),
        }
        for document in documents
    ]


@api.post("/workspaces/<workspace_id>/index")
@require_service_token
def index_workspace(workspace_id):
    payload = request.get_json(silent=True) or {}
    count = replace_workspace_documents(workspace_id, payload.get("documents", []))
    return jsonify({"indexed": count})


@api.post("/workspaces/<workspace_id>/ask")
@require_service_token
def ask_workspace(workspace_id):
    payload = request.get_json(silent=True) or {}
    question = payload.get("question", "").strip()
    if not question:
        return jsonify({"message": "question is required"}), 400
    answer, documents = answer_question(workspace_id, question)
    return jsonify({"answer": answer, "sources": _sources(documents)})


@api.post("/workspaces/<workspace_id>/task-plan")
@require_service_token
def plan_workspace_tasks(workspace_id):
    payload = request.get_json(silent=True) or {}
    request_text = payload.get("request", "").strip()
    if not request_text:
        return jsonify({"message": "request is required"}), 400
    plan, documents = create_task_plan(
        workspace_id,
        request_text,
        payload.get("members", []),
    )
    return jsonify({"plan": plan.model_dump(by_alias=True), "sources": _sources(documents)})
