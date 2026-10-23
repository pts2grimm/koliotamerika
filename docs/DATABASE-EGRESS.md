# Database traffic audit — 2026-10-23

## Architecture and access

Reviewed `eridan-staging` at `8ead4313`: Next.js 16.4.0, Payload 3.90.2, PostgreSQL adapter and private `payload` schema. The production Supabase connection was successfully verified with the existing Actions secret, TLS certificate verification and a read-only transaction. No production migrations, edits or copies were run.

Hostinger runs the Next server according to the deployment configuration and prior runtime logs. This task has no hPanel access: current instance count, restarts, active environment values and CDN hits have not been independently inspected. No passwords are needed in chat. To correlate the report, use Hostinger Runtime logs/deployment times and Supabase Usage for the same time range.

The auction catalogue comes from Eridan; its API responses are not Supabase egress. Supabase still services catalogue protection, activity records, quote lookups, content, accounts and administration. There is no database categories collection equivalent to the Partsworld example. Navigation is static and historical blog archive membership comes from `content/legacy-archives.json`.

## Evidence and changes

| Trigger | Before | Change |
| --- | --- | --- |
| Home page news cards | Three complete page documents on each render | Card fields only; anonymous 30-second process cache |
| Blog and related articles | Complete documents on a cache miss | Title, slug, intro, cover, legacy cover, publication date only |
| Category/tag/author archive | Complete article documents | Card projection and bounded anonymous 30-second cache |
| Admin Blog / Pages list | Up to 20 complete documents, including content | Title, slug, status, publication and update dates only; no cache |
| Sitemap | Full pages and cars in batches of 100 | Slug/update projection, redirect source only, bounded 30-second cache |
| Home / owned-car catalogue | Full descriptions, SEO and equipment | Card fields plus gallery preserved; availability stays uncached across requests |
| Public layout integration settings | Full settings row including encrypted CAPI token | Public flags/IDs and domain verification only; no cross-request cache |
| Public auction quote | Full quote including internal notes and an unnecessary count | Published price only, limit one, no pagination count; no cross-request cache |

Article and vehicle detail pages and editors still load their full content. Existing access filters, scheduled publication filtering, canonical URLs, redirects and SEO metadata are unchanged. Sitemap filtering happens before its cache; host information is not stored as authentication. Cache keys separate archive pages, article pages/limits and site/provider sitemap. Existing public cache has a 30-second hard TTL, 256-entry limit, coalescing, no stale-on-error serving and generation protection against an in-flight read refilling an invalidated entry.

Pages and media already invalidate public content after editing/deleting. Cars and redirects now also invalidate it. Invalidation is deferred until the request transaction finishes. Other server processes expire independently within 30 seconds; this is not cross-instance immediate invalidation. Publication time can therefore become visible up to the existing 30-second cache window later. Auth, customer sessions, inquiries, consent, rate limits, live availability and quote prices are not cached by this change.

### Observed production data, not traffic attribution

Read-only snapshot at 2026-10-23 16:26:23 UTC: `pages` has approximately 51 live rows; `cars` has no published rows. Supabase's cumulative scan counters included 9,993 sequential scans for `integrations`, 7,541 for `auction_quotes`, and 1,207 sequential / 1,486 index scans for `pages`. These counters do not establish egress, a time-normalized request rate, or which caller generated each scan.

Code proves that the public layout reads integration settings and vehicle views read quotes. Integration flags remain uncached so disabling tracking takes effect on the next read. The content projections eliminate demonstrably unnecessary fields. It is still a hypothesis that any one of these callers dominates the entire monthly bill; a representative production observation period is needed.

Startup invokes legacy/editorial initialization and idempotent content upgrades. These can read full page content to compare edits. They are startup work, not a recurring content-import timer, and were not skipped or rescheduled.

### Refreshes and background tasks

Reviewed admin report controls refresh manually. The new report has no polling. Model selection requests the model list when a make changes; it is not a timer. The auction countdown changes browser state only. Customer focus/storage events refresh authentication and saved cars; these freshness-sensitive checks remain intact.

Eridan reference caches (one hour) and search/detail caches/snapshots (short existing lifetimes) concern the external API, not bulk database scans. Catalogue security cleanup is hourly on demand; activity retention cleanup runs on the existing write/report paths. Those security/privacy timings remain unchanged. The daily encrypted backup is an external GitHub Actions job and is not counted by an application process meter.

No noncritical recurring database-reading worker was found that needs an admin-adjustable interval. No unused setting or additional settings-table read was introduced. Changing backup, retention or rate-limit timing merely to reduce traffic would require assessing recovery and protection consequences first.

## Admin report

`/admin/database-traffic` appears in navigation and report tabs. The view requires a Payload `users` administrator and admin access. `GET /api/admin/database-traffic` authenticates using the existing Payload session; guests and customers receive 403. Responses are `private, no-store`, vary on Cookie/Authorization and do not expose report data publicly. Normal session validation may itself query the database; telemetry does not persist to the database.

“Обнови” reads a fresh snapshot manually. “Изтегли отчет (JSON)” downloads the exact displayed snapshot in the browser, avoiding another request or switching to a different process during export.

The pg 8.16.x custom Client observes protocol message lengths without wrapping query callbacks or serializing results. It handles Payload ORM queries and operational SQL through the same pool. Stored state contains only allowlisted table/operation labels, numeric counters, dates and an opaque process instance identifier. No SQL text, parameters, rows, users, IPs, credentials or error messages are retained.

- MB = bytes / 1,000,000.
- Approximation includes DataRow, RowDescription and CommandComplete message lengths.
- Excludes TLS, connection setup, COPY, notices, error-response bodies and other protocol messages.
- Count is completed SQL statements plus failed statements, not HTTP requests. Returned rows include aggregate rows and RETURNING rows, not affected rows without RETURNING. An in-flight row may arrive before its query completes.
- Nested relational JSON is one protocol row. Joined bytes are assigned once to the primary outer table, not split or duplicated. Unresolved and multi-statement queries are labelled other/multiple.
- Finite schema/operation allowlists bound cardinality; no per-query history.
- Process-local only; restart loses counters. Separate processes, build jobs and backup jobs have separate totals. SQLite preview is explicitly marked uninstrumented.
- This is **not Supabase billed egress**, and it cannot reconstruct past traffic.

## Before/after measurements

### Production read-only SQL sample

Same 20 published articles, same ID ordering, one REPEATABLE READ / READ ONLY transaction, same driver and connection:

| Sample | Full parent rows | Card columns only | Difference |
| --- | ---: | ---: | ---: |
| 20 article parent rows | 408,241 bytes | 9,585 bytes | 97.65% |
| Owned-car parent rows | 0 records | 0 records | No meaningful vehicle comparison |

This production SQL probe excludes child-table sections, media population and Payload's count/relationship queries. It is a controlled column-selection sample, **not a measurement of the deployed optimization over real visitor traffic**. Its own reads also use a small amount of egress.

Source: [read-only audit run](https://github.com/pts2grimm/koliotamerika/actions/runs/39986691282). JSON artifact: `egress-production-read-only-sample`.

### Isolated CI PostgreSQL

The integration fixture runs both original and projected Payload queries against the same synthetic records, with the same ordering, page and access parameters. It compares every retained field, preserves image/gallery relationships, exercises callback/prepared/streaming/concurrent/multi-statement/error driver paths, and asserts warm cache hits issue no database query. Synthetic documents deliberately have large bodies; their reduction percentages must not be generalized to production.

Final measured fixture results and completed CI run are recorded in the PR. Artifact: `egress-synthetic-before-after`. No local benchmark was run because the supplied execution environment failed; GitHub Actions provides the isolated test environment instead.

## Validation and rollout

The dedicated workflow runs type checking, privacy/cache tests, PostgreSQL protocol integration, identical-fixture measurements, a production Next build, HTTP authorization/list/detail/sitemap checks and the existing regression suite. Production probing is separately gated by an explicit `[audit-production]` commit message; normal CI does not repeatedly read production.

No schema/data migration, content change, URL change, secret change, indexing change or production background interval change is included. Rollback is a code rollback.

After deployment, collect snapshots from the same process ID across a representative interval without a restart. Compare the same routes and request counts, separate warm/cold cache and initialization, and correlate with Supabase Usage. Other process IDs must be considered separately; one snapshot is not a site-wide total. Without the provider's usage window and representative request volume, no monthly saving is claimed.
