FROM node:22-bookworm

WORKDIR /app

# Install system-level Playwright dependencies first
RUN apt-get update && apt-get install -y \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libasound2 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Set browser path early so install + runtime agree on location
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright

COPY package*.json ./
RUN npm ci

# Install Chromium binary into the path defined above
RUN npx playwright install chromium

COPY . .

RUN npm run build && \
    test -f dist/main.js || (echo "ERROR: dist/main.js not found" && exit 1)

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/main.js"]