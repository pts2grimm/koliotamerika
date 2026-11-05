export const auctionSortOptions = [
 { value: '', label: 'Смесени Copart и IAAI', ordering: '-id', field: 'id', direction: -1 },
 { value: 'auction_soon', label: 'Най-скорошен търг', ordering: 'sale_date,id', field: 'sale_date', direction: 1 },
 { value: 'auction_late', label: 'Най-късен търг', ordering: '-sale_date,-id', field: 'sale_date', direction: -1 },
 { value: 'newest', label: 'Последно добавени', ordering: '-created_at,-id', field: 'created_at', direction: -1 },
 { value: 'year_desc', label: 'Година: нови към стари', ordering: '-year,-id', field: 'year', direction: -1 },
 { value: 'year_asc', label: 'Година: стари към нови', ordering: 'year,id', field: 'year', direction: 1 },
] as const
export function auctionSort(value: unknown) {
 return auctionSortOptions.find(option => option.value === value) || auctionSortOptions[0]
}

// Active catalogues start with the next auction; archives start with the latest
// ended auction. Keep explicit sorting choices in both sections.
export function catalogueSort(value: unknown, archive = false) {
 return auctionSort(value).value || (archive ? 'auction_late' : 'auction_soon')
}
