FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Jenkins/agent có thể đặt NODE_ENV=production; khi đó npm ci bỏ devDeps → không có tsc/shx, bin/ rỗng ở runtime.
ENV NODE_ENV=development

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY script ./script

RUN npm run build && test -f bin/script/server.js

# --- runtime ---
FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/bin ./bin

CMD ["node", "./bin/script/server.js"]
