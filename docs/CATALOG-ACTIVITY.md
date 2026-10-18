# Catalogue activity (API log tab)

Administrator path: /admin/catalog-activity, linked from navigation and overview tabs.

## Server catalogue requests (no browser consent dependency)

The first table in the report is catalog_requests, a private operational journal at the searchAuctions / auctionCar / lookupAuction service boundary. It runs on the server without reading cookies, session storage or customer authentication, including for visitors who have not chosen or have refused analytics. It records start time, operation, provider, allowlisted make/model, year range, page, lot/site, structurally valid VIN for vehicle/lookup requests, trusted-proxy IP/source, returned-page item count, generic outcome and elapsed time. It never saves arbitrary query text, URL, seller text, request/response bodies, exception messages, User-Agent, session/customer identifiers or credentials. VIN is trimmed, uppercased and restricted to 17 VIN characters; it comes from the resolved vehicle or an explicit VIN lookup, not a general catalogue result list. IP is personal data, so this log must not be described as anonymous. Unknown properties are dropped.

This is a catalogue-service request log, **not a count of external HTTP calls to Eridan**. Cache/snapshot hits also produce rows; one search may cause several upstream requests, and warm cache may cause none. Bots, metadata and prefetch calls may appear. React cache still coalesces detail calls within one render. Browser events are not required; no additional auction-provider call is made for logging. Search counts are returned page items, not the total matching inventory. Failed lookups can retain a structurally valid requested VIN, but no arbitrary query text.

Writes are scheduled with Next 16.4 after outside the data-cache functions. Provider errors/results remain unchanged if scheduling, storage or diagnostics fail; warnings are generic and bounded to once/minute/process. Preview builds skip logging. Non-request scripts cannot schedule after and produce no record. Full-page/CDN responses that do not execute this service also produce no new row. Delivery on process termination is best effort.

The additive migration creates an internal SQL table with no Payload public endpoint or customer relation. Only authenticated users with admin permission can read the view. Logs retain 30 days and at most 50000 rows using an atomic insert cap; cleanup is on the next write/report, not a timed job. Once full, new entries are dropped until capacity becomes available. There is no backfill or join to consented history, counters, inquiries or hosting logs. The cookie information separately discloses this operational journal; it does not claim an exemption for arbitrary cookieless visitor tracking.

### Trusted proxy IP and VIN

The additive 20261018_200000_catalog_request_details migration adds vin/ip/ip_source with blank defaults, preserving old records. It is retry-safe even if interrupted between columns. Old rows are not enriched or linked to consented history.

IP resolution requires the existing TRUST_PROXY=true setting and a controlled ingress proxy. The observer reads headers before Next after(), outside shared provider caches. It accepts a valid X-Real-IP first, otherwise only the LAST valid X-Forwarded-For entry. It never trusts the first entry or CF-Connecting-IP. IPv4/IPv6 use node:net validation; malformed values, zones, ports, oversized headers and arbitrary text are omitted. No header/body/query can directly supply the stored IP via a client beacon. No customer authentication is consulted.

[Hostinger CDN documentation](https://www.hostinger.com/support/hostinger-cdn-visitor-ip-addresses-in-logs-and-analytics/) says X-Real-IP is set to the connecting address and Hostinger appends that address last to X-Forwarded-For. Earlier entries are untrusted. Verify the actual application's ingress before enabling TRUST_PROXY; this code does not enable or change deployment environment variables. Another proxy/VPN can make this a proxy address, not proof of a person's identity. Missing/untrusted addresses render “Не е записан”; disabled TRUST_PROXY is explicitly shown in the admin report. Do not use this diagnostic log as authorization or identity proof. Existing account/inquiry rate-limit behavior is unchanged.

VIN/IP are visible only to administrators and follow the existing 30-day retention/50000-row cap. Cookie information discloses these additions. Daily counters and consented history below are separate and unchanged.

## Daily aggregate counters (no analytics consent required by the application)

The browser submits one counter increment when a first-page catalogue result or a successfully resolved lot becomes visible. Requests use credentials: omit and referrerPolicy: no-referrer. They do not access cookies/localStorage/sessionStorage for counting, and contain no browser, event, session or customer identifier, VIN, raw URL/query, arbitrary filters, exact time, IP or User-Agent. Only kind, catalogue section, archive flag, make/model, view lot/site and result/empty/error category are sent. The strict endpoint rejects extra keys and invalid labels; it never reads cookies or resolves customers.

catalog_totals stores only a daily count grouped by those vehicle dimensions, using Europe/Sofia calendar days. No individual event rows or per-event timestamps are created. Concurrent increments are atomic. The same group becomes count=2 rather than two visitor records. No public Payload collection or read endpoint exposes the table. The report is admin-only. A bucket can have a count of one, but contains no visitor link; this design does not establish a general legal exemption for all cookieless analytics. Hosting/network logs are separate and are not configured by this feature.

Everyone uses the same counters, regardless of consent; accepting cookies afterwards does not increment the current view again. Counters and consented history are separate datasets and are never summed or joined by visitor. Counters start at deployment with no backfill from the old history. No conversion or unique-person count is inferred.

Retained: last 90 calendar days, cleaned on the next counter write or authenticated report. No wall-clock cleanup job. Storage is bounded to 100000 buckets and 50000 increments per Sofia day, enforced in the atomic upsert without identifying a visitor. No retries or persistent deduplication tokens: a reload counts again, delivery failures/blocked requests are absent, and manual duplicate requests count again. A full page reload after withdrawing already-loaded third-party scripts also counts as a new load; no persistent identifier is introduced to deduplicate across reloads. These are approximate action counts, not proof of human visits.

## Detailed history (analytics consent required)

The existing catalog_events journal still requires current analytics consent on browser and server. Event/session UUIDs are HMACed; sessionStorage receipt is created only with consent. Authenticated customers are resolved server-side, with no retrospective attribution. No IP, User-Agent, free-form seller names, arbitrary URLs, API credentials or inquiry messages are stored. Public/customer reads and public creates/updates are denied. It retains 90 days and keeps its existing origin/body bounds, atomic limits and deduplication. Customer deletion nulls the relation.

Both datasets count hydrated visible first-page results including empty/error results and successful lot details. Cached results count; SSR, metadata requests, prefetches, pagination, unavailable vehicle details and the separate CMS /avtomobili catalogue do not. Successful VIN/lot lookups redirect to detail and count that view only. Granting consent can add the current page once to detailed history without another aggregate count. Neither path blocks navigation or adds auction-provider requests.

Actual inquiries are read from the existing operational collection independently of consent and are not duplicated into either dataset. Their date and car-text filters remain unchanged.

The additive idempotent 20261018_160000_catalog_totals migration adds only the private counter table. Rollback preserves it. No auth/content data, SEO URLs, provider credentials or hosting logs are changed. Cookie information describes both modes.
