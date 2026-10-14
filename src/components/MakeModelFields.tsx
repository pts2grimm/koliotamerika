'use client'

import { useEffect, useState } from 'react'
import { LoadingIndicator } from './LoadingIndicator'
import { canonicalEridanMake, sameEridanMake } from '@/lib/auction-providers/make-aliases'

type Props = {
  makes: Record<string, string[]>
  initialMake?: string
  initialModel?: string
  modelsOnDemand?: boolean
  vehicleType?: string
}

export function MakeModelFields({ makes, initialMake = '', initialModel = '', modelsOnDemand = false, vehicleType = '' }: Props) {
  const names = Object.keys(makes)
  const matchingMake = names.find(name => modelsOnDemand ? sameEridanMake(name, initialMake) : name.toLowerCase() === initialMake.toLowerCase()) || (modelsOnDemand ? canonicalEridanMake(initialMake) : initialMake)
  const [make, setMake] = useState(matchingMake)
  const [model, setModel] = useState(initialModel)
  const [retry, setRetry] = useState(0)
  const hasMakes = names.length > 0
  const [remote, setRemote] = useState<{ make: string; models: string[]; failed: boolean } | null>(null)
  useEffect(() => {
    if (!modelsOnDemand || !make || !hasMakes) return
    const controller = new AbortController()
    // A stalled connection must not leave the model selector disabled indefinitely.
    const timeout = window.setTimeout(() => {
      setRemote({ make, models: [], failed: true })
      controller.abort()
    }, vehicleType ? 45000 : 10000)
    fetch('/api/auction-models?make=' + encodeURIComponent(make) + (vehicleType ? '&vehicle_type=' + encodeURIComponent(vehicleType) : ''), { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Models unavailable')
        const data = await response.json()
        if (!Array.isArray(data.models) || data.models.some((item: unknown) => typeof item !== 'string')) throw new Error('Invalid models')
        if (!controller.signal.aborted) setRemote({ make, models: data.models, failed: false })
      })
      .catch(() => { if (!controller.signal.aborted) setRemote({ make, models: [], failed: true }) })
      .finally(() => window.clearTimeout(timeout))
    return () => { window.clearTimeout(timeout); controller.abort() }
  }, [make, modelsOnDemand, hasMakes, retry, vehicleType])
  const loading = Boolean(modelsOnDemand && make && remote?.make !== make)
  const modelError = Boolean(modelsOnDemand && remote?.make === make && remote.failed)
  const availableModels = modelsOnDemand ? remote?.make === make ? remote.models : [] : makes[make] || []
  const makeOptions = [...new Set([...names, ...(make ? [make] : [])])].sort((a, b) => a.localeCompare(b))
  const modelOptions = [...new Set([...availableModels, ...(model ? [model] : [])])].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  function changeMake(value: string) {
    setMake(value)
    setModel('')
  }

  // Keep search usable if the provider's make/model directory is unavailable.
  if (!names.length) return <>
    <label><span>Марка</span><input name="make" value={make} onChange={event => changeMake(event.target.value)} maxLength={100} placeholder="Въведи марка" /></label>
    <label><span>Модел</span><input name="model" value={model} onChange={event => setModel(event.target.value)} maxLength={100} disabled={!make} placeholder={make ? 'Въведи модел' : 'Първо избери марка'} /></label>
  </>

  return <>
    <label><span>Марка</span><select name="make" value={make} onChange={event => changeMake(event.target.value)}>
      <option value="">Всички марки</option>
      {makeOptions.map(name => <option key={name} value={name}>{name}</option>)}
    </select></label>
    <label className="model-field"><span>Модел</span>{modelError ? <><input name="model" value={model} onChange={event => setModel(event.target.value)} maxLength={100} placeholder="Въведи модел" /><small role="status">Списъкът не се зареди. Можеш да въведеш модела.</small><button className="text-link" type="button" onClick={() => { setRemote(null); setRetry(value => value + 1) }}>Зареди моделите отново</button></> : <select name="model" value={model} onChange={event => setModel(event.target.value)} disabled={!make || loading} aria-busy={loading}>
      <option value="">{loading ? 'Зареждане…' : make ? 'Всички модели' : 'Първо избери марка'}</option>
      {modelOptions.map(name => <option key={name} value={name}>{name}</option>)}
    </select>}{loading && model && <input type="hidden" name="model" value={model} />}{loading && <LoadingIndicator className="model-loading"><span className="model-loading-text">Зареждаме моделите…</span></LoadingIndicator>}</label>
  </>
}
