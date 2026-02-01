# =============================================================================
# Dockerfile for apps/app (Next.js)
# Build context: repository root
# Build command: docker build -f apps/app/Dockerfile .
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

# Copy all package.json files to enable pnpm workspace resolution
# Root packages
COPY apps/app/package.json ./apps/app/

# Shared packages (required by apps/app)
COPY packages/ai/package.json ./packages/ai/
COPY packages/analytics/package.json ./packages/analytics/
COPY packages/auth/package.json ./packages/auth/
COPY packages/collaboration/package.json ./packages/collaboration/
COPY packages/database/package.json ./packages/database/
COPY packages/design-system/package.json ./packages/design-system/
COPY packages/email/package.json ./packages/email/
COPY packages/feature-flags/package.json ./packages/feature-flags/
COPY packages/internationalization/package.json ./packages/internationalization/
COPY packages/next-config/package.json ./packages/next-config/
COPY packages/notifications/package.json ./packages/notifications/
COPY packages/observability/package.json ./packages/observability/
COPY packages/payments/package.json ./packages/payments/
COPY packages/rate-limit/package.json ./packages/rate-limit/
COPY packages/security/package.json ./packages/security/
COPY packages/seo/package.json ./packages/seo/
COPY packages/storage/package.json ./packages/storage/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/webhooks/package.json ./packages/webhooks/

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
COPY --from=deps /app/apps/app/node_modules ./apps/app/node_modules
COPY --from=deps /app/packages ./packages

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./

# Copy source code
COPY apps/app ./apps/app
COPY packages ./packages

# Generate Prisma client (required before build)
# SKIP_ENV_VALIDATION=1 bypasses env var checks during build (validated at runtime)
RUN SKIP_ENV_VALIDATION=1 pnpm --filter @repo/database exec prisma generate

# Build the app using Turborepo (handles internal package dependencies)
# Provide placeholder URLs for build-time static generation (replaced at runtime)
RUN SKIP_ENV_VALIDATION=1 \
    NEXT_PUBLIC_APP_URL=http://localhost:3000 \
    NEXT_PUBLIC_WEB_URL=http://localhost:3000 \
    pnpm turbo build --filter=app

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
# Next.js standalone output (if configured) or full build
COPY --from=builder /app/apps/app/.next ./apps/app/.next
COPY --from=builder /app/apps/app/public ./apps/app/public
COPY --from=builder /app/apps/app/package.json ./apps/app/package.json

# Copy workspace configuration (required for pnpm --filter)
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Copy node_modules (required for runtime)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/app/node_modules ./apps/app/node_modules

# Copy shared packages (bundled at build time, but some may have runtime dependencies)
COPY --from=builder /app/packages ./packages

# Set ownership to non-root user
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose the port Next.js listens on
EXPOSE 3000

# Start the application
CMD ["pnpm", "--filter", "app", "start"]
