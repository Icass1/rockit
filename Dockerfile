# Astro Dockerfile
FROM node:18-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install pnpm -g

# Copy application code
COPY . .
RUN rm --ignore-missing .env
RUN chown -R 1000:1000 /app

RUN pnpm install

# Build the Astro application
RUN pnpm run build

RUN chmod -R 775 /app/database

# Expose the application
EXPOSE 4321

USER 1000:1000

# Serve the Astro application
CMD ["node", "dist/server/entry.mjs"]
