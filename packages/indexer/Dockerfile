# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY packages/indexer/package.json ./packages/indexer/

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy indexer source
COPY packages/indexer ./packages/indexer

# Generate Prisma client
WORKDIR /app/packages/indexer
RUN pnpm prisma generate

# Build TypeScript
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY packages/indexer/package.json ./packages/indexer/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files and Prisma schema
COPY --from=builder /app/packages/indexer/dist ./packages/indexer/dist
COPY --from=builder /app/packages/indexer/node_modules/.prisma ./packages/indexer/node_modules/.prisma
COPY packages/indexer/prisma ./packages/indexer/prisma

WORKDIR /app/packages/indexer

# Expose ports
EXPOSE 3001 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the indexer
CMD ["node", "dist/index.js"]
