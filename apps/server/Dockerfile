FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY . .
RUN pnpm install --frozen-lockfile

FROM deps AS build
RUN pnpm --filter @snag/server build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN corepack enable
COPY --from=deps /app /app
EXPOSE 8080
CMD ["pnpm", "--filter", "@snag/server", "start"]
