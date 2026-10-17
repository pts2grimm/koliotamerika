'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { TextField, useForm, useFormFields } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
import {
  automaticPostalCode, buyerFields, buyerValues, distinctBuyers, isBulgaria,
  placeName, searchPlaces, type PostalPlace, type SavedBuyer,
} from '../../lib/bos-buyer'

export function BosBuyerPicker() {
  const { dispatchFields, setModified, disabled } = useForm()
  const id = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SavedBuyer[]>([])
  const [page, setPage] = useState(1)
  const [more, setMore] = useState(false)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    setResults([]); setMore(false)
    if (query.trim().length < 2) { setStatus(''); setLoading(false); return }
    const controller = new AbortController()
    setLoading(true); setStatus('Търсим купувачи…')
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ depth: '0', limit: '20', page: String(page), sort: '-updatedAt' })
        for (const key of [...buyerFields, 'stock']) params.set('select[' + key + ']', 'true')
        for (const [index, key] of ['buyerName', 'buyerPhone', 'buyerHomePhone', 'buyerWorkPhone'].entries()) {
          params.set('where[or][' + index + '][' + key + '][contains]', query.trim())
        }
        const response = await fetch('/api/bills-of-sale?' + params, {
          signal: controller.signal, credentials: 'same-origin', cache: 'no-store',
        })
        if (!response.ok) throw new Error('search')
        const data = await response.json()
        if (controller.signal.aborted) return
        const docs = distinctBuyers(data.docs ?? [])
        setResults(docs); setMore(Boolean(data.hasNextPage))
        setStatus(docs.length ? 'Избери запис, за да замениш данните на купувача в тази форма.' : 'Няма намерени купувачи. Можеш да въведеш данните ръчно.')
      } catch {
        if (!controller.signal.aborted) setStatus('Търсенето не успя. Опитай отново или попълни данните ръчно.')
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query, page])
  function select(buyer: SavedBuyer) {
    for (const [path, value] of Object.entries(buyerValues(buyer))) dispatchFields({ type: 'UPDATE', path, value })
    setModified(true); setQuery(''); setResults([])
  }
  return <section className="koa-bos-picker" aria-label="Купувач от предишен BOS">
    <label htmlFor={id}>Купувач от предишен BOS</label>
    <p>Потърси по име или телефон. Изборът попълва само купувача; данните остават редактируеми.</p>
    <input id={id} type="search" value={query} disabled={disabled} autoComplete="off" placeholder="Име или телефон — поне 2 знака"
      onChange={e => { setQuery(e.target.value); setPage(1); setResults([]); setMore(false) }} />
    <p role="status">{status}</p>
    {!!results.length && <ul className="koa-bos-options">
      {results.map(buyer => <li key={buyer.id}><button type="button" disabled={disabled || loading} onClick={() => select(buyer)}>
        <strong>{buyer.buyerName}</strong>
        <span>{[buyer.buyerAddress, buyer.buyerCity, buyer.buyerPostalCode, buyer.buyerCountry].filter(Boolean).join(', ')}</span>
        <small>{[buyer.buyerPhone, buyer.buyerHomePhone, buyer.buyerWorkPhone, buyer.stock].filter(Boolean).join(' · ')}</small>
      </button></li>)}
    </ul>}
    {(page > 1 || more) && <div className="koa-bos-pages">
      <button type="button" disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)}>Предишни</button>
      <span>Страница {page}</span>
      <button type="button" disabled={!more || loading} onClick={() => setPage(p => p + 1)}>Следващи</button>
    </div>}
  </section>
}

export const BosCityField: TextFieldClientComponent = props => {
  const { dispatchFields, setModified, disabled } = useForm()
  const [city, country] = useFormFields(([fields]) => [String(fields.buyerCity?.value ?? ''), fields.buyerCountry?.value] as const)
  const [places, setPlaces] = useState<PostalPlace[]>([])
  const [loadError, setLoadError] = useState(false)
  const [focused, setFocused] = useState(false)
  const [chosen, setChosen] = useState<{ place: PostalPlace; city: string } | null>(null)
  useEffect(() => { if (chosen && chosen.city !== city) setChosen(null) }, [city, chosen])
  const loaded = useRef(false)
  const bg = isBulgaria(country)
  const readOnly = disabled || props.readOnly
  useEffect(() => {
    if (!bg || !focused || loaded.current) return
    let active = true
    import('../../data/bg-postal-codes.json').then(module => {
      if (active) { setPlaces(module.default); loaded.current = true; setLoadError(false) }
    }).catch(() => { if (active) setLoadError(true) })
    return () => { active = false }
  }, [bg, focused])
  const matches = bg && focused && !readOnly && chosen?.city !== city ? searchPlaces(places, city) : []
  const selected = bg && chosen && chosen.city === city ? chosen.place : null
  function write(path: string, value: string) {
    dispatchFields({ type: 'UPDATE', path, value }); setModified(true)
  }
  function choose(place: PostalPlace) {
    const name = placeName(place, city)
    write('buyerCity', name)
    // Only an explicit selection changes postal code. Typing, loading, and reopening
    // a saved document must never overwrite an operator's address-specific code.
    write('buyerPostalCode', automaticPostalCode(place) ?? '')
    setChosen({ place, city: name })
  }
  return <div className="koa-bos-city" onFocus={() => setFocused(true)}
    onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false) }}>
    <TextField {...props} />
    {!readOnly && !bg && <small>За предложения с пощенски код попълни държава „България“ или „Bulgaria“.</small>}
    {!readOnly && bg && <small>Въведи град и избери от справочника. Пощенският код може да се коригира.</small>}
    {!readOnly && bg && loadError && <p role="status">Справочникът не се зареди. Въведи града и кода ръчно.</p>}
    {!!matches.length && <ul className="koa-bos-options" aria-label="Населени места">
      {matches.map((place, index) => <li key={index}><button type="button" onClick={() => choose(place)}>
        <strong>{place.name}</strong><small>Общ. {place.municipality} · Обл. {place.region}</small>
      </button></li>)}
    </ul>}
    {!readOnly && selected && automaticPostalCode(selected) === null && <div className="koa-bos-postal" role="status">
      <p>Потвърди кода според адреса. Справочникът съдържа основни кодове, а кварталите може да имат различни.</p>
      {selected.codes.map(code => <button type="button" key={code} onClick={() => write('buyerPostalCode', code)}>Използвай {code}</button>)}
      <small>Можеш да въведеш друг код в полето „Пощенски код“.</small>
    </div>}
    {!readOnly && bg && focused && city.trim().length >= 2 && places.length > 0 && !matches.length && !selected &&
      <p role="status">Няма съвпадение в справочника. Можеш да въведеш града и кода ръчно.</p>}
    {!readOnly && bg && <small className="koa-bos-attribution">Справочник: <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a> · CC BY 4.0</small>}
  </div>
}
