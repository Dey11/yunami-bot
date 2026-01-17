# Bun runtime for server
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json ./
RUN bun install

# Copy source files
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Set port environment variable
ENV PORT=3777

# Expose port (informational when using host network)
EXPOSE 3777

# Run the server
CMD ["bun", "run", "src/index.ts"]
