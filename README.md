# Cerebero

Cerebero is a hosted, private knowledge inbox for capturing links and Markdown notes, processing them deliberately, and finding them again.

The rewrite is being delivered phase by phase. See [`plan.md`](./plan.md) for product, architecture, security, design, and acceptance requirements.

## Prerequisites

- Node.js 22 or newer
- Bun 1.3.13

## Local development

```sh
cp .env.example .env
bun install
bun run dev
```

The Vite application runs at `http://localhost:5173` and proxies API and health requests to the Hono server at `http://localhost:3000`. Without `DATABASE_URL`, the HTTP foundation can start but readiness and database-backed features remain unavailable.

Deployment configuration is intentionally deferred. The anticipated shape is Vercel for the web application and Railway for the backend.

Authentication routes and UI are present, but they intentionally remain unavailable until real PostgreSQL, `AUTH_SECRET`, transactional email delivery, and optional Google OAuth credentials are configured. No runtime mock substitutes for those integrations.

The Phase 2 backend is also present: Item contracts, migration, owner-scoped Drizzle repository, capture and duplicate handling, Inbox/Library listing, editing, and lifecycle/pin actions. Frontend Capture and Inbox work is intentionally deferred to the next slice. A configured PostgreSQL database and live authentication session are required to exercise these routes at runtime.

Phase 3A adds the durable enrichment boundary. Link Capture and URL edits transactionally create or reset one enrichment record and PostgreSQL job. Lease-based claiming, bounded retries, terminal failure, validated result storage, and stale-job reconciliation are implemented without making network requests during Capture.

Phase 3B adds the isolated restricted outbound HTTP client. It validates every resolved IPv4/IPv6 address, pins the selected public address to the socket, repeats validation for bounded redirects, sends no user credentials or cookies, applies connection/inactivity/total timeouts, and accepts at most 1 MiB of uncompressed HTML or XHTML. Phase 3C's worker is its only runtime caller.

Phase 3C adds bounded metadata parsing and an independently runnable enrichment worker. The parser extracts only allowlisted plain text and validated metadata URLs from the document head. The worker processes at most four claimed jobs per batch by default, records stable retry/terminal classifications, reconciles stale leases, and drains active work during shutdown. Manual retry and enrichment UI remain later slices; live PostgreSQL and deliberate real-network acceptance are still pending.

With a real PostgreSQL database configured, run the worker separately from the HTTP and web processes:

```sh
bun run dev:worker
```

The worker can fetch external URLs already present in the enrichment queue. It is intentionally not started by `bun run dev`.

## Verification

```sh
bun run check
```

Browser-driven verification is intentionally excluded. Follow [`docs/manual-verification.md`](./docs/manual-verification.md) for visual checks.
