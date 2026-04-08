# Specialized Dockerfile for SLA Application (High Performance Standalone Build)
# =========================================================================

# Phase 0: Base image with shared system libraries
FROM node:20-slim AS base
ENV NEXT_TELEMETRY_DISABLED 1
# Install essential runtime libraries
RUN apt-get update && apt-get install -y openssl tini && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Phase 1: Dependencies - Using BuildKit caching for maximum speed
FROM base AS deps
COPY package.json package-lock.json ./
# 1. Optimize for low-RAM servers by limiting parallel connections
# 2. Use BuildKit cache mount to persist the .npm registry across builds
RUN npm config set maxsockets 3 && \
    --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --loglevel error

# Phase 2: Prisma Client Generation - Isolated layer for better caching
FROM base AS prisma
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
RUN npx prisma generate

# Phase 3: Builder - Only re-runs if code changes (excluding node_modules/prisma)
FROM base AS builder
COPY --from=prisma /app/node_modules ./node_modules
# Copy all source files
COPY . .
# Perform actual build
RUN npm run build

# Phase 4: Runner - Final minimal production image (~100MB)
FROM base AS runner
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy essential files for standalone mode
COPY --from=builder /app/public ./public
# Set the correct permissions for the cache folder
RUN mkdir .next && chown nextjs:nodejs .next

# Standalone output contains only necessary files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy prisma files for runtime migrations
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
