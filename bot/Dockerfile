# Build stage (ARM64 compatible)
FROM oven/bun:1-debian AS builder
WORKDIR /app

# Copy package files first for better caching
COPY package.json bun.lock* ./
RUN bun install || bun install --no-save

# Copy source and build
COPY . .
RUN bun run build

# Production stage
FROM node:20-slim
WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/assets ./assets

# Run the bot
CMD ["node", "dist/index.js"]
