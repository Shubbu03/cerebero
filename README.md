# Cerebero

Cerebero is a private personal Library for links and Markdown notes. Capture
stores an Item directly in the Library; there is no Inbox or processing queue.

See [`plan.md`](./plan.md) for the current product and architecture decisions.

## Requirements

- Node.js 22 or newer
- Bun 1.3.13
- PostgreSQL

## Local setup

```sh
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
cp packages/db/.env.example packages/db/.env
bun install
bun run db:migrate
bun run dev
```

The web app runs at `http://localhost:5173` and proxies API requests to the Hono
server at `http://localhost:3000`.

Configuration lives beside each consumer:

- `apps/server/.env` — HTTP server, database, and authentication
- `apps/web/.env` — optional browser configuration
- `packages/db/.env` — Drizzle migration connection

Keep the server and Drizzle `DATABASE_URL` values aligned for local work.

## Verification

```sh
bun run check
```

Codex does not run browser-driven verification. Use
[`docs/manual-verification.md`](./docs/manual-verification.md) for manual UI
checks.

Docker, CI/CD, and deployment configuration are intentionally deferred.
