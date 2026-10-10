'use client'

import { SiteLink as Link } from '@/components/SiteLink'
import { useState } from 'react'
import { ChevronDown, RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { FilterPanel } from './FilterPanel'
import { MakeModelFields } from './MakeModelFields'

export function AuctionFilters({ makes, initial }: { makes: Record<string, string[]>; initial: Record<string, string> }) {
  const [resetCount, setResetCount] = useState(0)
  const [yearFrom, setYearFrom] = useState(initial.year_from || '')
  const [yearTo, setYearTo] = useState(initial.year_to || '')
  const advancedCount = ['status', 'fuel', 'seller_type'].filter(key => initial[key]).length + (initial.site && initial.site !== '1,2' ? 1 : 0)

  return <FilterPanel count={Object.keys(initial).length}><form key={resetCount} className="auction-filters" action="/targove" aria-label="Филтри за автомобили">
    <div className="filter-scroll">
    <div className="filter-panel-heading"><span className="filter-group-name">Автомобил</span><h2><SlidersHorizontal size={19} />Намери точния автомобил</h2><Link href="/targove" className="filter-reset" onClick={event => { if (!Object.keys(initial).length) { event.preventDefault(); setYearFrom(''); setYearTo(''); setResetCount(value => value + 1) } }}><RotateCcw size={14} />Изчисти</Link></div>
    <div className="filter-primary">
      <MakeModelFields makes={makes} initialMake={initial.make} initialModel={initial.model} />
      <label><span>Година от</span><input type="number" name="year_from" min="1900" max={yearTo || 2100} value={yearFrom} onChange={event => setYearFrom(event.target.value)} placeholder="Всички" /></label>
      <label><span>Година до</span><input type="number" name="year_to" min={yearFrom || 1900} max="2100" value={yearTo} onChange={event => setYearTo(event.target.value)} placeholder="Всички" /></label>
    </div>
    <details className="filter-advanced" open={advancedCount > 0 ? true : undefined}>
      <summary><span><strong>Още филтри{advancedCount > 0 && <span className="filter-count">{advancedCount}</span>}</strong><small>Аукцион, състояние, гориво и продавач</small></span><ChevronDown size={18} /></summary>
      <div className="filter-secondary">
        <label>Аукцион<select name="site" defaultValue={initial.site || '1,2'}><option value="1,2">Copart и IAAI</option><option value="1">Copart</option><option value="2">IAAI</option></select></label>
        <label>Състояние<select name="status" defaultValue={initial.status || ''}><option value="">Всички</option><option value="Run & Drive">Движи се (Run & Drive)</option><option value="Starts">Запалва (Starts)</option><option value="Stationary">Не се движи (Stationary)</option><option value="Can't test">Не е тестван</option></select></label>
        <label>Гориво<select name="fuel" defaultValue={initial.fuel || ''}><option value="">Всички</option><option value="Gasoline">Бензин</option><option value="Diesel">Дизел</option><option value="Hybrid">Хибрид</option><option value="Electric">Електрически</option></select></label>
        <label>Продавач<select name="seller_type" defaultValue={initial.seller_type || ''}><option value="">Всички</option><option value="insurance">Застраховател</option><option value="dealer">Частно лице</option></select></label>
      </div>
    </details>
    </div>
    <div className="filter-actions"><span>Промените се прилагат с бутона.</span><button className="button button-dark" type="submit"><Search size={18} />Намери автомобил</button></div>
  </form></FilterPanel>
}
