FROM node:22-bookworm-slim AS frontend
WORKDIR /frontend
COPY react/package*.json ./
RUN npm ci --no-audit --no-fund
COPY react/ ./
RUN npm run build

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app/node
COPY node/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY node/ ./
COPY --from=frontend /frontend/build /app/react/build
USER node
EXPOSE 5000
CMD ["node", "server.js"]
