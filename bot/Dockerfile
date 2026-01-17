# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app

# Install dependencies
COPY package.json ./
RUN bun install

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

# Run the bot
CMD ["node", "dist/index.js"]
