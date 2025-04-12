# Astro Dockerfile
FROM node:20.18.3-slim

WORKDIR /app

# Install Python and other build dependencies
# RUN apt-get update && apt-get install -y \
#     python3.10 \
#     make \
#     g++ && \
#     apt-get clean && rm -rf /var/lib/apt/lists/*
RUN apt-get update && apt-get install -y python3 build-essential

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

EXPOSE 3000

# USER 1000:1000

RUN pnpm install
RUN pnpm run build

# Serve the Astro application
CMD pnpm start
