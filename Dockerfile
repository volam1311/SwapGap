FROM node:22-bookworm-slim AS client
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:22-bookworm-slim AS server
WORKDIR /app/server
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
COPY --from=server /app/server/node_modules ./server/node_modules
COPY server/package.json server/package-lock.json ./server/
COPY server/src ./server/src
COPY --from=client /app/client/dist ./client/dist

# SQLite (including WAL files) stays here so a volume/disk survives image rebuilds.
RUN mkdir -p /data
ENV NODE_ENV=production \
    PORT=4000 \
    DATA_DIR=/data

VOLUME ["/data"]
EXPOSE 4000
CMD ["node", "server/src/index.js"]
