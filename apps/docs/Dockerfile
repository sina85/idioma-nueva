# =============================================================================
# Dockerfile for apps/docs (Next.js - Simple Hello World)
# Build context: repository root
# Build command: docker build -f apps/docs/Dockerfile .
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: base
# Set up Node.js with pnpm enabled via corepack
# -----------------------------------------------------------------------------
FROM node:20-alpine AS base

RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

# -----------------------------------------------------------------------------
# Stage 2: deps
# Install all workspace dependencies required for the app
# -----------------------------------------------------------------------------
FROM base AS deps

WORKDIR /app

# Copy workspace configuration files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./

# Copy docs package.json
COPY apps/docs/package.json ./apps/docs/

# Install dependencies (frozen lockfile ensures reproducibility)
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 3: builder
# Build the Next.js application using Turborepo
# -----------------------------------------------------------------------------
FROM base AS builder

WORKDIR /app

# Copy installed dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/docs/node_modules ./apps/docs/node_modules

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./

# Copy source code
COPY apps/docs ./apps/docs

# Build the app using Turborepo
RUN pnpm turbo build --filter=docs

# -----------------------------------------------------------------------------
# Stage 4: runner
# Minimal production image
# -----------------------------------------------------------------------------
FROM base AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only the files needed for production runtime
COPY --from=builder /app/apps/docs/.next ./apps/docs/.next
COPY --from=builder /app/apps/docs/package.json ./apps/docs/package.json

# Copy workspace configuration (required for pnpm --filter)
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Copy node_modules (required for runtime)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/docs/node_modules ./apps/docs/node_modules

# Set ownership to non-root user
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose the port Next.js listens on
EXPOSE 3000

# Start the application
CMD ["pnpm", "--filter", "docs", "start"]
