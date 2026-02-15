# 🚀 SichrPlace Production Dockerfile
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies for better performance
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S sichrplace -u 1001

# === Dependencies Stage ===
FROM base AS deps

# Copy package files
COPY backend/package*.json ./backend/
COPY package*.json ./

# Install dependencies
RUN cd backend && npm ci --only=production --ignore-scripts

# === Builder Stage ===
FROM base AS builder

# Copy package files
COPY backend/package*.json ./backend/
COPY package*.json ./

# Install all dependencies (including dev)
RUN cd backend && npm ci --ignore-scripts

# Copy source code
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY . .

# Run build process
RUN cd backend && npm run build

# === Production Stage ===
FROM base AS runner

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001

# Copy node_modules from deps stage
COPY --from=deps --chown=sichrplace:nodejs /app/backend/node_modules ./backend/node_modules

# Copy built application
COPY --from=builder --chown=sichrplace:nodejs /app/backend ./backend
COPY --from=builder --chown=sichrplace:nodejs /app/frontend ./frontend
COPY --from=builder --chown=sichrplace:nodejs /app/package*.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Switch to non-root user
USER sichrplace

# Expose port
EXPOSE 3001

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "backend/server.js"]