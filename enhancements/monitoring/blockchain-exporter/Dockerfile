FROM node:16-alpine

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --production

# Copy application code
COPY . .

# Expose Prometheus metrics port
EXPOSE 9101

# Set environment variables
ENV NODE_ENV=production
ENV PROMETHEUS_PORT=9101
ENV SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Run as non-root user for better security
USER node

# Start the application
CMD ["node", "BlockchainExporter.js"] 