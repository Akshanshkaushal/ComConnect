FROM node:20-alpine

WORKDIR /app/backend

LABEL org.opencontainers.image.title="ComConnect Task Service"

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ .

ENV SERVICE_NAME=task-service
EXPOSE 5103

USER node
CMD ["node", "microservices/taskServer.js"]
