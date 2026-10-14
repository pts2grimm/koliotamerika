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

// Public catalogues default to the next auction, including a bare /targove URL.
export function catalogueSort(value: unknown) {
 return auctionSort(value).value || 'auction_soon'
}
