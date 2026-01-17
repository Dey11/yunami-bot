# Build stage (ARM64 compatible)
FROM --platform=linux/arm64 oven/bun:1-alpine AS builder
WORKDIR /app

# Copy source and build
COPY . .
RUN bun install
RUN bun run build

# Production stage
FROM --platform=linux/arm64 node:20-alpine
WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Run the bot
CMD ["node", "dist/index.js"]
