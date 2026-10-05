# API-free v0.4.1 VPS test packaging. No credentials during build.
ARG NODE_IMAGE=node:22-bookworm-slim
FROM ${NODE_IMAGE} AS build
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/* \
    && chown node:node /app
USER node
COPY --chown=node:node package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
COPY --chown=node:node tsconfig*.json ./
COPY --chown=node:node src/ ./src/
COPY --chown=node:node tests/ ./tests/
COPY --chown=node:node scripts/ ./scripts/
COPY --chown=node:node .gitignore ./.gitignore
RUN npm run test:tooling \
    && npm run test:core \
    && npm run build \
    && npm test \
    && npm prune --omit=dev --ignore-scripts --no-audit --no-fund

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production HOME=/tmp NPM_CONFIG_CACHE=/tmp/.npm
WORKDIR /app
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules/ ./node_modules/
COPY --from=build /app/dist/ ./dist/
COPY --from=build /app/scripts/ ./scripts/
COPY --from=build /app/.gitignore ./.gitignore
USER node
CMD ["node", "dist/index.js"]
