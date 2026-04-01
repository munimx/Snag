# Self-hosting Snag

This guide runs Snag server + web with PostgreSQL and Redis in Docker Compose.

## 1) Environment

Create a `.env` file next to your compose file:

```env
DATABASE_URL=postgresql://snag:snag@postgres:5432/snag
REDIS_URL=redis://redis:6379
HOST=0.0.0.0
PORT=8080
BODY_LIMIT_BYTES=1048576
RATE_LIMIT_MAX_PER_MINUTE=100
WAIT_TIMEOUT_MS=30000
DELIVERY_QUEUE_NAME=delivery-forwarding
ENABLE_DELIVERY_WORKER=true
MAGIC_LINK_TTL_MINUTES=15
SESSION_TTL_HOURS=720
APP_URL=http://localhost:3000
NEXT_PUBLIC_SERVER_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
```

## 2) Docker Compose

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: snag
      POSTGRES_USER: snag
      POSTGRES_PASSWORD: snag
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

  server:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    env_file:
      - .env
    depends_on:
      - postgres
      - redis
    ports:
      - '8080:8080'

  web:
    image: node:20-alpine
    working_dir: /workspace
    command: sh -lc "corepack enable && pnpm install --frozen-lockfile=false && pnpm --filter @snag/web dev"
    volumes:
      - .:/workspace
    environment:
      NEXT_PUBLIC_SERVER_URL: http://localhost:8080
      NEXT_PUBLIC_WS_URL: ws://localhost:8080/ws
    depends_on:
      - server
    ports:
      - '3000:3000'

volumes:
  postgres_data:
```

## 3) Start

```bash
docker compose up --build
```

## 4) CI/CD notes

- PR/main checks: `.github/workflows/ci.yml`
- Fly deploy on `main`: `.github/workflows/deploy.yml`
- npm/PyPI publish on version tags: `.github/workflows/publish.yml`
