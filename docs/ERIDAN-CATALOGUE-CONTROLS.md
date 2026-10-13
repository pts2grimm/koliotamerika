# Eridan catalogue controls

Explicit sorting uses documented compound ordering on each Eridan stream and a global merge before pagination. Choices: earliest/latest sale_date, latest created_at, year ascending/descending. Missing sale dates sort after dated lots in either direction. Default remains the mixed Copart/IAAI feed. No currency-dependent bid comparison is offered.

Sort is allowlisted, carried by filter submissions and pagination, and reset to page 1 on change. It is not counted as a filter chip. Sorted URLs retain existing noindex rules.

Vehicle type selects cars, motorcycles or ATV/UTV. Changing it clears dependent make/model without clearing other filter choices. Makes use existing category brand allowlists. Eridan /models has no type parameter: scoped models are collected from complete active, imaged, upcoming/undated /lots pages for the selected make/type, then grouped into model families. This avoids guessing classifications for shared makes such as Honda/BMW. Results are cached separately by make and type for one hour; incomplete scans fail rather than returning a partial dropdown. Cold model discovery can require several API pages. Original unscoped model directory remains available under All types.

Year dropdowns run from next model year back to 1900 (preserving valid selected future years from existing URLs). Inverted range options are disabled. User-visible category and sorting controls are Eridan-only; staging branch only.

Verification: isolated provider/URL tests, desktop/mobile browser scenarios and protected live API checks. Live logs contain counts and timing only, no vehicle records or credentials.
