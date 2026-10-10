'use client'

import { useState } from 'react'

type Props = {
  makes: Record<string, string[]>
  initialMake?: string
  initialModel?: string
}

export function MakeModelFields({ makes, initialMake = '', initialModel = '' }: Props) {
  const names = Object.keys(makes)
  const matchingMake = names.find(name => name.toLowerCase() === initialMake.toLowerCase()) || initialMake
  const [make, setMake] = useState(matchingMake)
  const [model, setModel] = useState(initialModel)
  const makeOptions = [...new Set([...names, ...(make ? [make] : [])])].sort((a, b) => a.localeCompare(b))
  const modelOptions = [...new Set([...(makes[make] || []), ...(model ? [model] : [])])].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

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
    <label><span>Модел</span><select name="model" value={model} onChange={event => setModel(event.target.value)} disabled={!make}>
      <option value="">{make ? 'Всички модели' : 'Първо избери марка'}</option>
      {modelOptions.map(name => <option key={name} value={name}>{name}</option>)}
    </select></label>
  </>
}
