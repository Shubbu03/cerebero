# Cerebero

**A private library for links and Markdown notes.** Save the context once, then
find it again—without inboxes, filing, or a review queue.

Items can be links, notes, or both. They support tags, search, archive, trash,
and revocable read-only share links. Authentication is Google-only.

## Run locally

Requires Bun 1.3.13+, Node.js 22+, and PostgreSQL.

```sh
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
cp packages/db/.env.example packages/db/.env
bun install
bun run db:migrate
bun run dev
```

Set the same `DATABASE_URL` in `apps/server/.env` and `packages/db/.env`.
For Google sign-in, also set `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, and
`GOOGLE_CLIENT_SECRET` in `apps/server/.env`.

The app is available at <http://localhost:5173>; the API runs on port 3000.

## Chrome extension

The MV3 extension captures the active page through its popup or the explicit
**Save to Cerebero** page menu action. It uses the same Google account as the
dashboard and requests only `activeTab`, `contextMenus`, `identity`, `storage`,
and the configured Cerebero API origin.

```sh
cp apps/extension/.env.example apps/extension/.env.local
bun run dev:extension
```

Release metadata, permission justifications, stable-ID setup, and the manual
Chrome checks are documented in
[`apps/extension/RELEASE.md`](apps/extension/RELEASE.md). The public data policy
is in [`PRIVACY.md`](PRIVACY.md).

## Useful commands

```sh
bun run check                 # format, lint, typecheck, test, and build
bun run db:migrate            # apply database migrations
bun run purge-expired-trash   # delete items past the 30-day trash retention
bun run --filter @cerebero/extension zip:bootstrap  # first Web Store draft
```
