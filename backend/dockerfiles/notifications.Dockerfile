FROM node:20-alpine

WORKDIR /app/backend

LABEL org.opencontainers.image.title="ComConnect Notification Service"

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ .

ENV SERVICE_NAME=notification-service
EXPOSE 5104

USER node
CMD ["node", "microservices/notificationServer.js"]
