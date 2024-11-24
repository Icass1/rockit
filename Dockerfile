# Astro Dockerfile
FROM node:18-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install pnpm -g

# Copy application code
COPY . .

RUN rm .env || true

RUN chown -R 1000:1000 /app
# RUN chmod -R 775 /app/database

EXPOSE 4321

USER 1000:1000

RUN pnpm install
RUN pnpm run build

# RUN chown -R 1000:1000 /app

# Serve the Astro application
CMD ["node", "dist/server/entry.mjs"]