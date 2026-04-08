# Specialized Dockerfile for SLA Application (Optimized Standalone Build)
# =========================================================================

# Phase 0: Base image with shared system libraries
FROM node:20-slim AS base
RUN apt-get update && apt-get install -y openssl tini && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Phase 1: Dependencies - Only re-runs if package.json or package-lock.json change
FROM base AS deps
COPY package.json package-lock.json ./
# Use npm ci for clean, deterministic installs
RUN npm ci --no-audit --no-fund --loglevel error

# Phase 2: Builder - Re-runs if any source code changes
FROM base AS builder
# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy all source files
COPY . .
# Generate Prisma client for build time
RUN npx prisma generate
# Environment variable for build-time optimization
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Phase 3: Runner - Final minimal production image
FROM base AS runner
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy essential files for standalone mode
COPY --from=builder /app/public ./public
# Set the correct permissions for the cache folder
RUN mkdir .next && chown nextjs:nodejs .next

# Standalone output contains only necessary files
# This includes its own node_modules (minimal version)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy prisma schema so migrations can run at runtime if needed
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

ENTRYPOINT ["/usr/bin/tini", "--"]
# In standalone mode, we start with server.js
CMD ["node", "server.js"]
