# Eridan model families

Scope: eridan-staging. The model selector uses families rather than engine/trim variants. A selected family expands to all matching IDs from the complete, make-scoped model directory in a single documented CSV model_ids query. Expansion happens upstream before pagination, preserves all other filters, and does not alter the original listing title/model.

Native /series is not a reliable grouping source: during verification it returned the same variant names as /models, series__name did not expand BMW 3 SERIES variants, and sampled IAAI lots lacked a series. CSV model_ids was verified against both auctions.

Rules cover numbered BMW series, BMW SUV/Z/i families, Mercedes classes, Audi and Lexus families and common model roots across other makes. Longer distinct models (Corolla Cross, Mustang Mach-E, Bronco Sport, etc.) remain separate. BMW M3/M4 and Audi S/RS models remain separate performance models; M340i belongs to 3 SERIES. Unknown variants remain selectable; they are not silently discarded or assigned by fuzzy matching. Motorcycles/ATV/UTV are not grouped by arbitrary first letters or engine sizes.

Old specific-model URLs such as BMW model=328I continue to use exact model__name if they are not a family label. Listings keep their actual variant. Directory requests share the existing one-hour reference cache; search/model-list cache versions are bumped. Failed directory requests are not converted into empty results.

Validation covers mapping boundaries, exact legacy links, pre-pagination expansion, mixed auctions, and desktop/mobile selectors. Live logs include only aggregate counts, never vehicle records, VINs, URLs or credentials.
