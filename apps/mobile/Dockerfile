# syntax=docker/dockerfile:1
FROM node:22-alpine
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi \
    && apk add --no-cache libc6-compat && \
    corepack enable && corepack prepare pnpm@11.0.8 --activate
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/mobile/package.json ./apps/mobile/
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY patches/ ./patches/
RUN --mount=type=cache,id=pnpm-expo,target=/root/.local/share/pnpm/store \
    --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi \
    && pnpm install --frozen-lockfile --ignore-scripts

COPY apps/mobile ./apps/mobile
COPY packages ./packages

ARG EXPO_PUBLIC_BACKEND_URL
ENV EXPO_PUBLIC_BACKEND_URL=${EXPO_PUBLIC_BACKEND_URL}
ENV REACT_NATIVE_PACKAGER_HOSTNAME=${REACT_NATIVE_PACKAGER_HOSTNAME:-rockit.rockhosting.lan}
ENV NODE_ENV=development
EXPOSE 9102
WORKDIR /app/apps/mobile
CMD ["npx", "expo", "start", "--host", "localhost", "--port", "9102"]
