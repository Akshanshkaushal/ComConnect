FROM node:20-alpine

WORKDIR /app/backend

LABEL org.opencontainers.image.title="ComConnect AI Orchestrator"

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ .

ENV SERVICE_NAME=ai-orchestrator
EXPOSE 5105

USER node
CMD ["node", "microservices/aiOrchestratorServer.js"]
