FROM node:20-alpine

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ .

EXPOSE 5000

USER node
CMD ["npm", "start"]
