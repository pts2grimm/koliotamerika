# Catalogue activity (API log tab)

Administrator path: /admin/catalog-activity. Available from the left navigation and overview tabs.

This is a first-party catalogue-interest journal, not an upstream Eridan transport log or a count of unique people. It records hydrated visible first-page catalogue results (including empty/error results) and successfully opened vehicle details. Cached results count; server rendering, metadata requests, prefetches and pagination do not. Reloading a result page counts as another action. Successful VIN/lot lookups redirect to the detail, so only the resulting vehicle view is counted, not a second search. Failed valid VIN/lot lookups can appear as searches. It cannot prove every browser event is human.

Both browser and server require current analytics consent. No events are backfilled for earlier pages. Granting consent on the current visible result page can record that page once. Receipt/event are random UUIDs; only HMACs persist in the DB. The receipt lives in sessionStorage, not a cross-session visitor identifier. Authenticated customers are resolved server-side only, with no retrospective attribution. No IP, user agent, free-form seller names, arbitrary URLs, API credentials or inquiry text are stored.

Admin-only collection and report; public create/update/read and customer access are denied. The narrow POST accepts allowlisted data, verifies origin, caps a streamed body at 4 KiB, bounds writes atomically (120/session/hour, 5000/hour globally, 250000 retained rows), and deduplicates event delivery. Tracking failures never delay search/navigation. There are no retries/backfills, so blocked requests and refusals are absent. Partial coverage is disclosed in the dashboard.

Retention is 90 days, with deletion on the next accepted activity request or authenticated report view; no wall-clock cleanup job. Customer deletion nulls its relation. Date boundaries use Europe/Sofia. Counts and rankings follow current date/action/make/model filters. Raw history is paginated. Existing inquiries remain in their own collection and are linked from the report.

The additive idempotent 20261018_120000_catalog_events migration only creates the journal and indexes. Rollback preserves the table. No provider API changes, secrets or SEO URLs are involved. Cookie information is updated to describe the first-party report.

The report also displays actual saved inquiries in a separate, independently paginated section and KPI. These records are operational submissions, not consent-gated analytics; they retain the existing collection/access/retention rules and are not duplicated into catalog_events. Date filters apply; make/model filters match the car text. Action-type filter applies only to activity. No conversion rate is inferred from partial consented browsing coverage.
