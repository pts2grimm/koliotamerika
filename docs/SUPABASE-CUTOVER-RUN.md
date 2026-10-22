# Guarded production transfer

Prepared against tested application revision `75fe5b653cd5e30aa99c70f2d96d451ab6c7cfc7`.

The `codex/supabase-cutover-tools-2026-10-22` branch runs syntax validation only. It does not connect to either database.

Create the execution branch `codex/supabase-cutover-2026-10-22` from this tools commit only after:
1. All PostgreSQL migration verification jobs pass for the pinned application revision.
2. The compatible application is deployed to Hostinger while retaining Turso.
3. The operator confirms `DATABASE_MAINTENANCE=true` is deployed, all old instances have drained, and other writers are stopped.

Creating that execution branch is the deliberate transfer trigger. The workflow checks the successful CI run and tested application files, verifies the application's maintenance response on public/admin/write endpoints, requires an empty target, enforces the expected Supabase project and verified TLS, then initializes schema and copies a consistent read-only Turso snapshot. Every copied table is verified by count and full-row digest. Supabase anonymous/authenticated roles must not have schema access.

HTTP maintenance checks cannot prove that separate background writers or old instances have stopped; the operator confirmation is still necessary.

No private data artifacts or raw child errors are published. The schema-only temporary PAYLOAD_SECRET is never written to Hostinger; preserve the real Hostinger PAYLOAD_SECRET.

The workflow does not change Hostinger variables or remove maintenance. After successful transfer, follow docs/SUPABASE-MIGRATION.md. A populated target blocks a second copy: inspect rather than emptying or overwriting it.
