# Bun runtime for server
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Expose port (informational when using host network)
EXPOSE 3000

# Run the server
CMD ["bun", "run", "src/index.ts"]
