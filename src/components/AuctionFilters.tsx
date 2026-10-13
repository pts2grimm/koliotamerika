'use client'

import { SiteLink as Link } from '@/components/SiteLink'
import { useState } from 'react'
import { ChevronDown, RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { FilterPanel } from './FilterPanel'
import { MakeModelFields } from './MakeModelFields'
import { isEridanRoadMake, eridanRoadTypes, type EridanRoadType } from '@/lib/auction-providers/eridan-scope'
import { auctionFormURL } from '@/lib/auction-filters'

export function AuctionFilters({ makes, initial, modelsOnDemand = false, unavailableFilters = [], eridan = false, basePath = '/targove' }: { makes: Record<string, string[]>; initial: Record<string, string>; modelsOnDemand?: boolean; unavailableFilters?: readonly string[]; eridan?: boolean; basePath?: string }) {
  const [resetCount, setResetCount] = useState(0)
  const [modelReset, setModelReset] = useState(0)
  const [vehicleType, setVehicleType] = useState(eridanRoadTypes.includes(initial.vehicle_type as EridanRoadType) ? initial.vehicle_type : '')
  const categoryMakes = eridan && vehicleType ? Object.fromEntries(Object.entries(makes).filter(([make]) => isEridanRoadMake(make, vehicleType as EridanRoadType))) : makes
  const latestYear = Math.max(new Date().getFullYear() + 1, ...[initial.year_from, initial.year_to].map(value => Number(value) >= 1900 && Number(value) <= 2100 ? Number(value) : 1900))
  const years = Array.from({ length: latestYear - 1900 + 1 }, (_, index) => String(latestYear - index))
  const [yearFrom, setYearFrom] = useState(initial.year_from || '')
  const [yearTo, setYearTo] = useState(initial.year_to || '')
  const advancedCount = ['status', 'fuel', 'seller_type', 'seller'].filter(key => initial[key]).length + (initial.site && initial.site !== '1,2' ? 1 : 0)

  return <FilterPanel count={Object.keys(initial).filter(key => key !== 'sort').length}><form key={resetCount} className="auction-filters" action={basePath} onSubmit={event => {
    event.preventDefault()
    window.location.assign(auctionFormURL(new FormData(event.currentTarget), basePath))
  }} aria-label="Филтри за автомобили">
    {eridan && initial.sort && <input type="hidden" name="sort" value={initial.sort} />}
    <div className="filter-scroll">
    <div className="filter-panel-heading"><span className="filter-group-name">Автомобил</span><h2><SlidersHorizontal size={19} />Намери точния автомобил</h2><Link href={basePath} className="filter-reset" onClick={event => { if (!Object.keys(initial).length) { event.preventDefault(); setYearFrom(''); setYearTo(''); setVehicleType(''); setResetCount(value => value + 1) } }}><RotateCcw size={14} />Изчисти</Link></div>
    <div className="filter-primary">
      {eridan && <label className="vehicle-type-field"><span>Вид превозно средство</span><select aria-label="Вид превозно средство" name="vehicle_type" value={vehicleType} onChange={event => { setVehicleType(event.target.value); setModelReset(value => value + 1) }}><option value="">Всички видове</option><option value="Automobile">Коли</option><option value="Motorcycle">Мотори</option><option value="ATVUTV">ATV / UTV</option></select></label>}
      <MakeModelFields key={vehicleType + ':' + resetCount + ':' + modelReset} makes={categoryMakes} initialMake={resetCount === 0 && modelReset === 0 ? initial.make : ''} initialModel={resetCount === 0 && modelReset === 0 ? initial.model : ''} modelsOnDemand={modelsOnDemand} vehicleType={eridan ? vehicleType : undefined} />
      <label><span>Година от</span><select aria-label="Година от" name="year_from" value={yearFrom} onChange={event => setYearFrom(event.target.value)}><option value="">Всички</option>{years.map(year => <option key={year} value={year} disabled={Boolean(yearTo) && Number(year) > Number(yearTo)}>{year}</option>)}</select></label>
      <label><span>Година до</span><select aria-label="Година до" name="year_to" value={yearTo} onChange={event => setYearTo(event.target.value)}><option value="">Всички</option>{years.map(year => <option key={year} value={year} disabled={Boolean(yearFrom) && Number(year) < Number(yearFrom)}>{year}</option>)}</select></label>
    </div>
    <details className="filter-advanced" open={advancedCount > 0 ? true : undefined}>
      <summary><span><strong>Още филтри{advancedCount > 0 && <span className="filter-count">{advancedCount}</span>}</strong><small>Аукцион, състояние, гориво и продавач</small></span><ChevronDown size={18} /></summary>
      <div className="filter-secondary">
        <label>Аукцион<select aria-label="Аукцион" name="site" defaultValue={initial.site || '1,2'}><option value="1,2">Copart и IAAI</option><option value="1">Copart</option><option value="2">IAAI</option></select></label>
        <label>Състояние<select disabled={unavailableFilters.includes('status')} aria-describedby={unavailableFilters.includes('status') ? 'auction-filter-availability' : undefined} name="status" defaultValue={initial.status || ''}><option value="">Всички</option><option value="Run & Drive">Движи се (Run & Drive)</option><option value="Starts">Запалва (Starts)</option><option value="Stationary">Не се движи (Stationary)</option>{eridan ? <option value="Enhanced Vehicles">Enhanced Vehicles</option> : <option value="Can't test">Не е тестван</option>}</select></label>
        <label>Гориво<select name="fuel" defaultValue={initial.fuel || ''}><option value="">Всички</option><option value="Gasoline">Бензин</option><option value="Diesel">Дизел</option><option value="Hybrid">Хибрид</option><option value="Electric">Електрически</option></select></label>
        <label>Продавач<select disabled={unavailableFilters.includes('seller_type')} name="seller_type" defaultValue={initial.seller_type || ''}><option value="">Всички</option><option value="insurance">Застраховател</option><option value="dealer">Частно лице</option></select></label>

      </div>
      {unavailableFilters.length > 0 && <p id="auction-filter-availability" className="bid-note">Избраният филтър временно не е достъпен.</p>}
      {eridan && <p className="bid-note">Run &amp; Drive означава, че при проверката автомобилът е запалил и се е придвижил. Enhanced Vehicles не потвърждава запалване или движение. При широко търсене избери и марка или модел.</p>}
    </details>
    </div>
    <div className="filter-actions"><span>Промените се прилагат с бутона.</span><button className="button button-dark" type="submit"><Search size={18} />Намери автомобил</button></div>
  </form></FilterPanel>
}
