# Eridan catalogue date scopes and seller filters

Scope: eridan-staging.

- Active searches use documented `sale_date__gte` and `sale_date__isnull=true` in separate streams, retaining undated lots without walking expired rows that Eridan still calls active.
- Streams keep both auctions, pagination, deduplication and the existing car/motorcycle/ATV/UTV restrictions. Archive behaviour and detail date resolution remain unchanged.
- The catalogue owner explicitly chose this convention: trimmed nonempty seller -> insurance; blank/missing seller -> private (legacy URL value `dealer`). It is not a provider assertion of insurer status. Details explain the convention in the seller-category tooltip.
- Seller category is filtered before pagination, not sent as an undocumented API parameter. Legacy seller-name URL filters remain supported until removed or a new form is submitted.
- Form submission serializes only the current fields, removes empty/default values and stale page/lot queries, encodes literal ampersands once, and uses one value per key. Removing make clears model; pagination retains active filters.
- Scan calls are bounded by the number of independent streams (16 minimum, 48 maximum); local condition/category scans have a 20-second admission deadline. Broad advanced queries can still require narrower criteria when the upstream has no corresponding filter.
- No raw API vehicle records or credentials are written by the verification scripts.
