# Bun runtime for server (ARM64 compatible)
FROM --platform=linux/arm64 oven/bun:1-alpine AS base
WORKDIR /app
COPY . .

# Install dependencies
RUN bun install

# Generate Prisma client
RUN bunx prisma generate

# Set port environment variable
ENV PORT=3777

# Expose port (informational when using host network)
EXPOSE 3777

# Run the server
CMD ["bun", "run", "src/index.ts"]
