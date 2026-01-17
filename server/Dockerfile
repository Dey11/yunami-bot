# Bun runtime for server (ARM64 compatible)
FROM oven/bun:1-debian AS base
WORKDIR /app

# Copy package files first for better caching
COPY package.json bun.lock* ./
RUN bun install || bun install --no-save

# Copy remaining source files
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Set port environment variable
ENV PORT=3777

# Expose port (informational when using host network)
EXPOSE 3777

# Run the server
CMD ["bun", "run", "src/index.ts"]
