FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile

COPY . .
RUN yarn build

# --- runtime ---
FROM node:20-bookworm-slim

WORKDIR /app

# Serve static SPA output
RUN npm install -g serve@14

COPY --from=builder /app/dist ./dist

CMD ["sh", "-c", "serve -s dist -l ${PORT:-8080}"]
