# Turso → Supabase

The active application is `eridan-staging`. The old `hostinger-preview` branch is not part of this migration.

## Connection and schema

- Keep SQLite/Turso as the default until the cutover; `DATABASE_PROVIDER=postgres` explicitly selects PostgreSQL.
- PostgreSQL uses the private `payload` schema, serial IDs, verified TLS and a small pool (5 connections).
- For Supabase use the Session pooler on port 5432. The PostgreSQL connection goes in `DATABASE_URI`.
- The official Supabase root CA is bundled in `src/lib/supabase-ca.ts`. A custom trusted CA can be supplied in `DATABASE_CA_CERT`.
- SQLite migrations remain unchanged. PostgreSQL has its own generated baseline and operational tables; schema push is disabled.
- Keep the original `PAYLOAD_SECRET`: changing it affects sessions and encrypted integration settings.
- Supabase Auth and Storage are not used. Preserve the current Hostinger `MEDIA_DIR` and all media files. A database copy does not copy images or PDF assets.

## Rehearsal

GitHub Actions creates an isolated PostgreSQL service, initializes the schema without seeding, and reads a consistent Turso snapshot using repository secrets `DATABASE_URI` and `DATABASE_AUTH_TOKEN`. No source writes are performed.

The transfer verifies every copied table with a normalized, order-independent full-row digest and count. It preserves IDs, password salts/hashes, relations, JSON, timestamps, sessions, document party snapshots and editorial journals. PostgreSQL receives its own migration history; the SQLite schema ledger remains in the retained Turso database.

The transfer refuses missing tables/columns, required unmapped destination columns, unexpected tables and nonempty destinations. It rolls back the target transaction on failure and advances serial sequences only for copied rows. Target sequence increments may survive a failed transaction, so retries recheck emptiness and reset them after successful inserts.

Only counts and validation stages go into logs. Production rows, secrets and document PDFs are not uploaded as build artifacts. Operational tests run only on local CI PostgreSQL. Real-copy PDF validation keeps bytes in memory.

## Final transfer and cutover

1. Complete PostgreSQL compatibility, concurrency, browser and copy rehearsal checks before touching live configuration.
2. Deploy compatible code while retaining the existing Turso settings. Verify that the live site still works.
3. Retain the original Turso connection and an export; preserve media and `PAYLOAD_SECRET`.
4. Enable `DATABASE_MAINTENANCE=true` in Hostinger and redeploy. Verify public routes and write endpoints return 503 with Retry-After. Ensure all old application instances have drained and stop other database writers. CDN cached pages may still be visible; writes must be blocked at the origin.
5. Run schema-only preparation against the empty Supabase project, then the verified copy with `MIGRATION_SOURCE_FROZEN=true`. This flag is an operator attestation, not an automatic proof that all writers stopped. Never use it during a rehearsal.
6. Compare source/destination counts and digests and verify schema permissions. If any check fails, keep maintenance enabled and retain Turso unchanged.
7. Set Hostinger `DATABASE_PROVIDER=postgres`, replace its `DATABASE_URI` with the checked Supabase connection, and keep all other service settings and `PAYLOAD_SECRET`. Deploy and verify initialization succeeds.
8. Disable maintenance and verify admin login, existing BOS/Invoice PDFs, pages and scheduled articles, consent choices, API logs, inquiry save/email and customer login.

No deployment or production cutover occurs merely by opening this PR or running the rehearsal.

## Rollback

Before accepting writes on Supabase, revert Hostinger to its retained Turso URI/token and SQLite provider, then disable maintenance. After Supabase accepts new writes, switching back blindly would lose those changes: first freeze writes and reconcile/export the new records. Never delete either database as part of the cutover. Destructive migration down operations are disabled.
