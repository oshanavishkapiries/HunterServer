# Use official Playwright image to ensure all system dependencies are met
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY core/package*.json ./core/
COPY servers/package*.json ./servers/

# Install dependencies
# 1. Install core dependencies
WORKDIR /app/core
RUN npm install

# 2. Install server dependencies
WORKDIR /app/servers
RUN npm install

# Copy source code
WORKDIR /app
COPY . .

# Environment variables
ENV NODE_ENV=production
ENV CHROME_PATH=/ms-playwright/chromium-1148/chrome-linux/chrome
ENV DATA_DIR=/app/data

# Expose HTTP server port
EXPOSE 3000

# Copy entrypoint
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Default command: Run both servers
ENTRYPOINT ["/app/entrypoint.sh"]
