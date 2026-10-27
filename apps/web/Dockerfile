# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi \
    && apk add --no-cache libc6-compat && \
    corepack enable && corepack prepare pnpm@11.0.8 --activate
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY patches/ ./patches/
RUN --mount=type=cache,id=pnpm-frontend,target=/root/.local/share/pnpm/store \
    --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi \
    && pnpm install --frozen-lockfile --ignore-scripts
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
COPY turbo.json version.json ./
ARG ROCKIT_VERSION=2.0.0
ENV ROCKIT_VERSION=${ROCKIT_VERSION}
ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
ARG NEXT_PUBLIC_S3_PUBLIC_ENDPOINT_URL
ENV NEXT_PUBLIC_S3_PUBLIC_ENDPOINT_URL=${NEXT_PUBLIC_S3_PUBLIC_ENDPOINT_URL}
RUN pnpm build:web

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/web/server.js"]
