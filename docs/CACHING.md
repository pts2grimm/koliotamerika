# Eridan staging cache policy

The frontend stays dynamic: no shared HTML cache for profiles, saved cars, admin or authentication.
Next's existing auction Data Cache remains in use; Cache Components are not enabled as a side effect.

## Auctions

- Search, detail and lookup: existing 60-second revalidation. This is stale-while-revalidate, not a hard maximum age if upstream refresh fails.
- Makes/models/reference directories: existing one-hour revalidation.
- Catalogue-to-detail snapshots: hard 60-second maximum from the original fetch time, bounded to 256 lots.
- Identical concurrent requests are coalesced within one process. Errors propagate, never become empty successful catalogues.
- Eridan search keys normalize empty values, parameter order, make aliases, auction order, page/size defaults and the default sort. Every effective category, filter, page and ordering remains part of the key. No global catalogue cache shared across differing filters.

## Public CMS content

Anonymous page/article queries and public site settings use a bounded in-memory cache (256 entries per Node process), with a **hard 30-second expiry**, in-flight request sharing and no stale fallback. Queries always use public access rules and no user. Staff REST/admin/preview and private collections bypass it.

Pages, media and site-setting mutations clear this cache after the HTTP response, when Payload's transaction has completed. In-flight old reads cannot repopulate it after invalidation. CLI imports run outside Next and other Node workers learn changes within 30 seconds. No Redis, database migration, persistent cache files or credentials are needed.

Scheduled articles become visible on the first request after cache expiry (at most 30 seconds after the release time, plus query time). Future articles and drafts cannot be published early by authenticated cache warming. Page misses expire too. Layout remains dynamic, so Next does not freeze a 404 or future publication into static HTML.

This cache resets on restart/deploy. It accelerates repeated reads in a process, not a first request after deployment; separate Node workers do not share memory. Cross-process immediate invalidation would require a shared cache/message layer.

## Measurement

Temporarily set AUCTION_LOGGING=true in the Eridan site's environment and redeploy.
Runtime logs include:
- event=upstream: one record per actual Eridan HTTP attempt, status and response-header latency.
- event=search: total search time, dataAgeMs, item count and a hashed normalized query.
No tokens, VINs, raw filter values, request bodies or full URLs are logged. dataAgeMs is not a cache-hit flag. Upstream time excludes JSON decoding; search time includes the whole search.

Compare a first request and repeated requests for the same filters, then change seller/category/sort/page and confirm different results. Disable logging after collecting a short sample. Browser integration prints local cold/warm blog and article response timings; CI timings are not Hostinger performance guarantees.

## Images

Blog images already use next/image with responsive sizes and lazy loading except the lead image. Auction originals are supplied by external image hosts. This change does not proxy all auction photos or introduce blanket long-lived HTML/CDN headers. Image/CDN tuning should follow a browser network measurement on Hostinger.
