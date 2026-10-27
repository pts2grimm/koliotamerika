# Auction SEO

Active and archived auction lots use WebPage and BreadcrumbList JSON-LD. Active lots retain FAQPage markup matching the visible questions; this does not promise Google FAQ rich results. Vehicle/Product nodes are deliberately omitted: Vehicle inherits Product in Schema.org, and product snippets require offers, review or aggregateRating. These pages have no verified retail Offer or genuine review data. Current bids, missing-price UI fallbacks, archive sale results and upstream buy-now values alone must not create an Offer. Any future product markup needs a separately verified offer and its applicable terms.

Visible VINs, mileage, specifications, prices, galleries and page content remain unchanged. No product-specific properties are moved onto WebPage. Archives keep factual text; a past date never claims a confirmed sale. Detail titles preserve auction/lot identity within 70 characters; descriptions stay within 180. Canonicals, robots and sitemaps remain unchanged.

References checked 2026-10-27:
- https://schema.org/Vehicle
- https://developers.google.com/search/docs/appearance/structured-data/product-snippet

The audit should be rerun after deployment. Existing errors disappear only after recrawl; removing ineligible product markup is not gaining product rich-result eligibility.


## Sitemaps

- Existing /sitemap.xml remains the CMS sitemap and does not query Eridan.
- /sitemap-index.xml references it plus four feeds at the root-scoped /sitemap-auctions.xml?section= endpoint: cars, cars-archive, powersports, powersports-archive.
- Each feed includes the first catalogue page (up to 48 unique lots with galleries, both auctions), with nearest upcoming sales or most recent ended sales. This is a rotating discovery sample, **not a full inventory export or a durable VIN archive**. Further listings are linked through catalogue pagination.
- Feeds reuse the catalogue data cache. One section's provider error returns 503 and Retry-After, never a misleading successful empty sitemap.
- No invented lastmod: auction dates and today's date are not page modification dates.
- Index/feeds check canonical host and SITE_INDEXABLE before provider calls. The temporary Hostinger domain advertises no sitemap and emits empty feeds.
- On the real domain, robots advertises both the existing CMS sitemap and the new index. Submit /sitemap-index.xml in Search Console after the production deployment; this PR neither enables staging indexing nor submits it.
- Complete long-term indexing of all historical lots requires a persistent inventory of public lot URLs and retention/removal rules. Do not imply that this bounded feed supplies that already.

## Public CMS audit

scripts/audit-public-seo.mjs reads anonymous pages and rendered HTML from staging and production, without CMS credentials or writes. It reports missing explicit CMS SEO fields separately from missing rendered metadata, duplicate titles/descriptions, advisory length limits, H1/canonical gaps and inaccessible URLs. It caps pagination/rendering and reports incomplete coverage honestly. A fallback description is not automatically a missing meta description.

The report is uploaded as the public-seo-audit Actions artifact. Editorial text is not overwritten automatically. Live deployment values must be distinguished from the branch's code.
