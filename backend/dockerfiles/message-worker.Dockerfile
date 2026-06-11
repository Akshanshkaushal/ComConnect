FROM node:20-alpine

WORKDIR /app/backend

LABEL org.opencontainers.image.title="ComConnect Message Persistence Worker"

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ .

ENV SERVICE_NAME=message-persistence-worker
EXPOSE 5106

USER node
CMD ["node", "microservices/messageWorkerServer.js"]
