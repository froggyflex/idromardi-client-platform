FROM node:20 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/frontend/dist ./frontend/dist
COPY backend ./backend
COPY package.json package-lock.json ./
RUN npm ci --production
EXPOSE 4000
ENV NODE_ENV=production
ENTRYPOINT ["node", "backend/server.js"]
