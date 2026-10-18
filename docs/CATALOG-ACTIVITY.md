# Catalogue activity (API log tab)

Administrator path: /admin/catalog-activity, linked from navigation and overview tabs.

## Daily aggregate counters (no analytics consent required by the application)

The browser submits one counter increment when a first-page catalogue result or a successfully resolved lot becomes visible. Requests use credentials: omit and referrerPolicy: no-referrer. They do not access cookies/localStorage/sessionStorage for counting, and contain no browser, event, session or customer identifier, VIN, raw URL/query, arbitrary filters, exact time, IP or User-Agent. Only kind, catalogue section, archive flag, make/model, view lot/site and result/empty/error category are sent. The strict endpoint rejects extra keys and invalid labels; it never reads cookies or resolves customers.

catalog_totals stores only a daily count grouped by those vehicle dimensions, using Europe/Sofia calendar days. No individual event rows or per-event timestamps are created. Concurrent increments are atomic. The same group becomes count=2 rather than two visitor records. No public Payload collection or read endpoint exposes the table. The report is admin-only. A bucket can have a count of one, but contains no visitor link; this design does not establish a general legal exemption for all cookieless analytics. Hosting/network logs are separate and are not configured by this feature.

Everyone uses the same counters, regardless of consent; accepting cookies afterwards does not increment the current view again. Counters and consented history are separate datasets and are never summed or joined by visitor. Counters start at deployment with no backfill from the old history. No conversion or unique-person count is inferred.

Retained: last 90 calendar days, cleaned on the next counter write or authenticated report. No wall-clock cleanup job. Storage is bounded to 100000 buckets and 50000 increments per Sofia day, enforced in the atomic upsert without identifying a visitor. No retries or persistent deduplication tokens: a reload counts again, delivery failures/blocked requests are absent, and manual duplicate requests count again. These are approximate action counts, not proof of human visits.

## Detailed history (analytics consent required)

The existing catalog_events journal still requires current analytics consent on browser and server. Event/session UUIDs are HMACed; sessionStorage receipt is created only with consent. Authenticated customers are resolved server-side, with no retrospective attribution. No IP, User-Agent, free-form seller names, arbitrary URLs, API credentials or inquiry messages are stored. Public/customer reads and public creates/updates are denied. It retains 90 days and keeps its existing origin/body bounds, atomic limits and deduplication. Customer deletion nulls the relation.

Both datasets count hydrated visible first-page results including empty/error results and successful lot details. Cached results count; SSR, metadata requests, prefetches, pagination, unavailable vehicle details and the separate CMS /avtomobili catalogue do not. Successful VIN/lot lookups redirect to detail and count that view only. Granting consent can add the current page once to detailed history without another aggregate count. Neither path blocks navigation or adds auction-provider requests.

Actual inquiries are read from the existing operational collection independently of consent and are not duplicated into either dataset. Their date and car-text filters remain unchanged.

The additive idempotent 20261018_160000_catalog_totals migration adds only the private counter table. Rollback preserves it. No auth/content data, SEO URLs, provider credentials or hosting logs are changed. Cookie information describes both modes.
