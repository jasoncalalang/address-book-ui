# Multi-stage build:
#   1. "build"   — install all deps (including dev), run vite build to produce
#                  the static SPA in dist/.
#   2. runtime   — install only prod deps, copy dist/ and server/, run the BFF.
#
# The BFF (server/index.js) serves the built React app AND proxies /api to the
# upstream Spring Boot service via cluster DNS.

FROM node:22-alpine AS build
RUN apk add --no-cache --upgrade libcrypto3 libssl3 libpng zlib
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
RUN apk add --no-cache --upgrade libcrypto3 libssl3 libpng zlib && \
    wget -qO- https://registry.npmjs.org/picomatch/-/picomatch-4.0.4.tgz | \
    tar xz -C /usr/local/lib/node_modules/npm/node_modules/picomatch --strip-components=1
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --spider -q http://localhost:3000/healthz || exit 1
CMD ["node", "server/index.js"]
