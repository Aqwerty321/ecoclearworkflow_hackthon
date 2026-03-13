FROM node:20-slim

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json ./
RUN npm install --production

# Copy application code
COPY . .

# Create data directory for SQLite
RUN mkdir -p data

# Create non-root user
RUN useradd -m -r appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8003

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD node -e "const ws=new (require('ws'))('ws://localhost:8003');ws.on('open',()=>{ws.close();process.exit(0)});ws.on('error',()=>process.exit(1));setTimeout(()=>process.exit(1),5000)" || exit 1

CMD ["node", "src/server.js"]
