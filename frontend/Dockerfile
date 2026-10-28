# ==============================================================================
# Tier-1 Enterprise Multi-Stage Dockerfile for React 19 Frontend
# Multi-stage compilation with Vite, optimized Nginx static asset delivery
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build & Static Asset Generation
# ------------------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Optimize layer caching for npm dependencies
COPY package*.json ./
RUN npm install

# Copy frontend source code & build configuration
COPY . .

# Compile TypeScript and bundle Vite production assets
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Hardened Nginx Production Web Server
# ------------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runner

# Remove default boilerplate website
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled production bundle from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy production Nginx reverse proxy configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose standard HTTP web port
EXPOSE 80

# Healthcheck probe using built-in /healthz endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:80/healthz || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
