FROM node:20-alpine

WORKDIR /app/backend

LABEL org.opencontainers.image.title="ComConnect Identity Service"

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ .

ENV SERVICE_NAME=identity-service
EXPOSE 5101

USER node
CMD ["node", "microservices/identityServer.js"]
