FROM node:20-alpine

WORKDIR /app/gateway

COPY gateway/package*.json ./
RUN npm install --omit=dev

COPY gateway/ .

EXPOSE 5000

USER node
CMD ["npm", "start"]
