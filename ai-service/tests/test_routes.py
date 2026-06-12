import pytest

from app import create_app


class TestConfig:
    TESTING = True
    AI_SERVICE_TOKEN = "test-token"
    OPENAI_API_KEY = ""
    OPENAI_MODEL = "test-model"
    CHROMA_DIR = "/tmp/test-chroma"
    RETRIEVAL_LIMIT = 3


@pytest.fixture()
def client():
    return create_app(TestConfig).test_client()


def test_health(client):
    assert client.get("/health").get_json() == {"status": "ok"}


def test_requires_service_token(client):
    response = client.post("/v1/workspaces/abc/ask", json={"question": "hello"})
    assert response.status_code == 401


def test_rejects_empty_question(client):
    response = client.post(
        "/v1/workspaces/abc/ask",
        headers={"X-Service-Token": "test-token"},
        json={"question": ""},
    )
    assert response.status_code == 400


def test_empty_workspace_search_does_not_require_embeddings(client):
    response = client.post(
        "/v1/workspaces/abc/search",
        headers={"X-Service-Token": "test-token"},
        json={"query": "", "tags": []},
    )
    assert response.status_code == 200
    assert response.get_json() == {"results": []}
