export type CatalogueParams = Record<string, string | string[] | undefined>
export function catalogueQuery(params: CatalogueParams) {
 const rawPage = params.page
 const page = rawPage === undefined ? 1 : typeof rawPage === 'string' && /^[1-9]\d*$/.test(rawPage) ? Number(rawPage) : NaN
 const validPage = Number.isSafeInteger(page) && page <= 10000
 const q = typeof params.q === 'string' ? params.q.slice(0, 80).trim() : ''
 const rawBudget = typeof params.budget === 'string' ? Number(params.budget) : 0
 const budget = Number.isFinite(rawBudget) && rawBudget > 0 ? rawBudget : 0
 const sort = typeof params.sort === 'string' && ['price', '-price', '-year'].includes(params.sort) ? params.sort : '-createdAt'
 const filtered = Boolean(q || budget || sort !== '-createdAt')
 return { page, validPage, q, budget, sort, filtered }
}
export function cataloguePath(query: ReturnType<typeof catalogueQuery>, page = query.page) {
 const params = new URLSearchParams()
 if (query.q) params.set('q', query.q)
 if (query.budget) params.set('budget', String(query.budget))
 if (query.sort !== '-createdAt') params.set('sort', query.sort)
 if (page > 1) params.set('page', String(page))
 return '/avtomobili' + (params.size ? '?' + params : '')
}
