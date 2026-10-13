# Eridan condition filters, prices and sold archive

- Mechanical condition comes only from highlights: RUNS AND DRIVES -> Run & Drive, ENGINE START PROGRAM -> Starts, STATIONARY -> Stationary.
- ENHANCED VEHICLES is an independent label and does not assert starting or driving. CERT-* / AUTOCHECK / IV never imply condition.
- buy_now_price is displayed as Buy Now separately from current_bid. Null, nonpositive, unknown-currency and nonactive prices are not offered.
- The normal catalogue queries status=active. /targove/arhiv queries status=sold, is indexable only when the deployment explicitly enables SITE_INDEXABLE outside preview, and is explicitly a provider archive, not our completed customer transactions.
- Detail lookup prefers an active event for the exact same auction + lot. Without an active event, only a latest sold record is displayed as a closed listing; older unsold history does not become an available car. A past date alone never means sold.
- Eridan documents no highlights or seller-category query. Condition and seller-name matching scan API pages before filling and paginating each auction/category stream. No unsupported parameters are sent upstream.
- Local scans are bounded to 16 lot requests and a 12-second admission deadline. On incomplete scans, return an explicit narrow-your-search error, never a partial/empty catalogue. Cache successful searches for 60 seconds. Broad/rare filters may require selecting make/model/year.
- Seller is a case-insensitive name substring, not insurer classification. Missing seller never matches. Existing seller_type links remain explicitly unsupported.
- Archive cards and details render only the VIN supplied by the provider; masked VINs are never reconstructed.
- A disabled removal button is intentionally a UI placeholder, with an explicit not-yet-available notice and no payment/deletion side effects. Paid removal requires confirmed pricing, a payment provider and durable suppression before launch; it is not enabled by these catalogue changes.
- No production provider, database, secrets or DNS is changed. Staging stays noindex.
