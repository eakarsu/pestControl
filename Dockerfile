FROM node:22-bookworm-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:22-bookworm-slim AS backend-deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

FROM backend-deps AS operations
COPY backend/prisma ./prisma
COPY backend/src ./src
COPY backend/scripts ./scripts
ARG DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV DATABASE_URL=$DATABASE_URL
RUN npm run prisma:generate
CMD ["npm", "run", "worker"]

FROM backend-deps AS backend-production
COPY backend/prisma ./prisma
ARG DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV DATABASE_URL=$DATABASE_URL
RUN npm run prisma:generate && npm prune --omit=dev
COPY backend/src ./src

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3001 FRONTEND_DIST_DIR=/app/frontend
WORKDIR /app/backend
RUN groupadd --system app && useradd --system --gid app app
COPY --from=backend-production --chown=app:app /app/backend ./
COPY --from=frontend-build --chown=app:app /app/frontend/dist /app/frontend
USER app
EXPOSE 3001
CMD ["node", "src/index.js"]
