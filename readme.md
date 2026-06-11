# ComConnect

ComConnect is a real-time event collaboration platform for workspace chat,
tasks, notifications, and AI-assisted planning.

## Features

- Workspace registration, membership, and roles
- Direct and group chat with Socket.IO
- Workspace task allocation, status, and comments
- Kafka, Redis, and Firebase notification pipeline
- Workspace-scoped RAG over chats, tasks, and workspace metadata
- Approval-gated LangChain task planning agent
- Group chat summarizer
- Event coordinator agent
- Swagger API documentation
- Docker Compose, Render/Vercel, and AWS ECS deployment paths

## Architecture

The public API gateway routes to independently deployable identity, chat, task,
notification, and AI orchestrator services. The Flask/LangChain AI engine is
internal-only and stores one Chroma vector collection per workspace.

See:

- [Production architecture](docs/architecture-guide.md)
- [AI workflows](docs/workspace-ai-workflows.md)
- [Deployment guide](docs/deployment-guide.md)
- [Testing guide](docs/testing-and-verification.md)

## Run Locally

1. Copy `.env.example` to `.env`.
2. Add `OPENAI_API_KEY` and Firebase values when those integrations are needed.
3. Start the stack:

```bash
docker compose up --build
```

Open:

- App: `http://localhost:3000`
- Swagger: `http://localhost:5000/api-docs`
- Service health: `http://localhost:5000/health/services`

## Repository Layout

```text
frontend/       React application
gateway/        Public API and WebSocket gateway
backend/        Node services, models, controllers, and service entry points
ai-service/     Flask, LangChain, Chroma, and AI tests
infra/aws/      ECS, ECR, ALB, CloudFront, S3, Redis, and Secrets Manager
docs/           Architecture, AI, deployment, and verification guides
render.yaml     Render Blueprint
vercel.json     Vercel frontend build
```
