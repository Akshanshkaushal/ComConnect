FROM node:20-alpine

WORKDIR /app/backend

LABEL org.opencontainers.image.title="ComConnect Chat Service"

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ .

ENV SERVICE_NAME=chat-service
EXPOSE 5102

USER node
CMD ["node", "microservices/chatServer.js"]
