# Astro Dockerfile
FROM node:18-slim

WORKDIR /app

# Install Python and other build dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    make \
    g++ && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set Python for node-gyp
# RUN npm config set python "/usr/bin/python3"
RUN export python3=/usr/bin/python3

# Install dependencies
COPY package*.json ./
RUN npm install pnpm -g

# Copy application code
COPY . .

RUN rm .env || true

RUN chown -R 1000:1000 /app

EXPOSE 4321

USER 1000:1000

RUN pnpm install
RUN pnpm run build

# Serve the Astro application
CMD ["node", "dist/server/entry.mjs"]
