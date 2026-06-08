import re

from flask import current_app
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings


def _collection_name(workspace_id):
    safe_id = re.sub(r"[^a-zA-Z0-9_-]", "-", workspace_id)
    return f"workspace-{safe_id}"[:63]


def _embeddings():
    return OpenAIEmbeddings(api_key=current_app.config["OPENAI_API_KEY"])


def workspace_store(workspace_id):
    return Chroma(
        collection_name=_collection_name(workspace_id),
        embedding_function=_embeddings(),
        persist_directory=current_app.config["CHROMA_DIR"],
    )


def replace_workspace_documents(workspace_id, raw_documents):
    store = workspace_store(workspace_id)
    existing = store.get(include=[])
    if existing["ids"]:
        store.delete(ids=existing["ids"])

    documents = [
        Document(page_content=item["content"], metadata=item.get("metadata", {}))
        for item in raw_documents
        if item.get("content", "").strip()
    ]
    ids = [item["id"] for item in raw_documents if item.get("content", "").strip()]
    if documents:
        store.add_documents(documents=documents, ids=ids)
    return len(documents)


def retrieve(workspace_id, query):
    store = workspace_store(workspace_id)
    return store.similarity_search(
        query,
        k=current_app.config["RETRIEVAL_LIMIT"],
    )
