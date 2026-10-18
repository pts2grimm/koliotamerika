import type { CatalogActivity } from './catalog-activity'

// A bucket describes vehicles, never a browser, customer or individual event.
export type CatalogTotal = {
  kind: 'search' | 'view'; section: 'cars' | 'powersports'; archive: boolean
  make: string; model: string; lot: string; site: string; outcome: string
}
const label = (value: unknown) => {
  if (typeof value !== 'string') return ''
  const text=value.trim().replace(/\s+/g,' ').toUpperCase()
  return text.length<=100 && /^[A-Z0-9 &+()./-]*$/.test(text) && !/^[A-HJ-NPR-Z0-9]{17}$/.test(text) ? text : ''
}
export function catalogTotalData(data: CatalogActivity): CatalogTotal {
  const view=data.kind==='view'
  const make=label(data.make)
  return {kind:data.kind,section:data.section,archive:data.archive,make,model:make?label(data.model):'',
    lot:view && /^\d{1,12}$/.test(data.lot || '') ? data.lot! : '',
    site:view && /^[12]$/.test(data.site || '') ? data.site! : '',
    outcome:view?'':data.outcome || 'error'}
}
export function validateCatalogTotal(value: unknown): CatalogTotal | null {
  if (!value || typeof value!=='object' || Array.isArray(value)) return null
  const v=value as Record<string,unknown>
  const keys=['kind','section','archive','make','model','lot','site','outcome']
  if (Object.keys(v).length!==keys.length || Object.keys(v).some(key=>!keys.includes(key))) return null
  if ((v.kind!=='search' && v.kind!=='view') || (v.section!=='cars' && v.section!=='powersports') || typeof v.archive!=='boolean') return null
  for (const key of ['make','model','lot','site','outcome']) if(typeof v[key]!=='string')return null
  if(label(v.make)!==v.make || label(v.model)!==v.model || (!v.make && v.model)) return null
  if(v.kind==='view' ? !/^\d{1,12}$/.test(v.lot as string) || !/^[12]$/.test(v.site as string) || v.outcome!==''
    : v.lot!=='' || v.site!=='' || !['results','empty','error'].includes(v.outcome as string)) return null
  return v as CatalogTotal
}
