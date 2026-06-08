# Workspace AI Assistant

ComConnect uses a separate Flask and LangChain service for workspace-scoped RAG
and task planning.

## Security boundary

- Express authenticates the user and verifies workspace membership.
- Express collects only that workspace's chat messages, tasks, and members.
- The Flask service is internal and requires `X-Service-Token`.
- Each workspace has a separate Chroma collection.
- A generated task plan cannot create tasks directly. Express signs the proposal
  for 30 minutes and creates tasks only after the user explicitly approves it.

## Run with Docker

Set `OPENAI_API_KEY`, `OPENAI_MODEL`, and a strong `AI_SERVICE_TOKEN` in `.env`.
Use `.env.example` as a starting point.

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:3000`
- Express API: `http://localhost:5000`
- AI health check: `http://localhost:5001/health`

## Express endpoints

```text
POST /api/ai/workspaces/:workspaceId/sync
POST /api/ai/workspaces/:workspaceId/ask
POST /api/ai/workspaces/:workspaceId/task-plan
POST /api/ai/workspaces/:workspaceId/task-plan/apply
```

The assistant automatically refreshes its workspace index before answering or
planning. A content fingerprint avoids embedding unchanged documents again in
the same backend process.
