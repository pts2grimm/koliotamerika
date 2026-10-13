# Eridan conditions, prices and expired-auction archive

The scope is eridan-staging only.

- RUNS AND DRIVES -> Run & Drive; ENGINE START PROGRAM -> Starts; STATIONARY -> Stationary.
- ENHANCED VEHICLES is independent and never implies starting/driving. AUTOCHECK, CERT-* and IV do not imply condition.
- Buy Now displays a positive buy_now_price and known currency separately from the current bid. Closed events offer neither current bids nor Buy Now.
- Active catalogue: status=active and no expired date. Archive /targove/arhiv: sale_date__lte=now. An expired active or not_sold event says "Търгът е минал"; only explicit sold says "Продаден".
- Detail resolves the supplied latest sale in one exact auction+lot request. It does not make a second request looking for a replacement date after an expired sale. No frozen local history database is introduced; refreshed source responses remain authoritative.
- Reported 72239476 returned active, sale_date 2026-10-12T19:00:00Z on 2026-10-13. It therefore appears in the archive without asserting a confirmed sale.
- Mechanical and seller-name filtering scans pages before filling/paginating each stream. Only documented API params are sent. Requests are bounded (16 lot calls, 12-second admission deadline for local condition/seller scans); incomplete scans ask for narrower filters rather than returning partial results.
- Seller name is case-insensitive text matching, not an invented insurer classification.
- VIN is displayed as supplied, preserving masks. Archive entries include a disabled removal placeholder. No checkout or deletion is implemented; PayPal is deferred by the user.
- Archive root is linked and added to the sitemap for an indexable Eridan deployment. Paginated canonicals are self-referencing; filter combinations stay noindex. Staging remains noindex.
- No production branch, database, secrets or DNS changes.
