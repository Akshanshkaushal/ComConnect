from flask import Blueprint, jsonify, request

from .auth import require_service_token
from .chains import answer_question, coordinate_event, create_task_plan, summarize_chat
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


@api.post("/workspaces/<workspace_id>/event-coordinator")
@require_service_token
def coordinate_workspace_event(workspace_id):
    payload = request.get_json(silent=True) or {}
    question = payload.get("question", "").strip()
    if not question:
        return jsonify({"message": "question is required"}), 400
    report, documents = coordinate_event(
        workspace_id,
        question,
        payload.get("members", []),
    )
    return jsonify({"report": report.model_dump(), "sources": _sources(documents)})


@api.post("/chats/summary")
@require_service_token
def summarize_group_chat():
    payload = request.get_json(silent=True) or {}
    messages = payload.get("messages", [])
    if not messages:
        return jsonify({"message": "messages are required"}), 400
    summary = summarize_chat(payload.get("chatName", "Group chat"), messages)
    return jsonify({"summary": summary.model_dump()})
