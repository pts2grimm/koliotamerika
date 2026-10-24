'use client'
import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useAccount } from './AccountProvider'
import { vehicleKey, type SavedVehicle } from '@/lib/account-validation'
export { readSaved, savedKey } from './AccountProvider'
export type SavedCar = { lot: string; site: string; title: string }
export function SaveVehicle({ vehicle, variant = 'icon' }: { vehicle: SavedVehicle; variant?: 'icon' | 'detail' }) {
 const account = useAccount(); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
 const saved = account.saved.some(v => vehicleKey(v) === vehicleKey(vehicle))
 return <span className={`save-control${variant === 'detail' ? ' save-control-detail' : ''}`}><button type="button" className={`${variant === 'detail' ? 'button button-outline save-detail-button' : 'save-auction'} ${saved ? 'saved' : ''}`} disabled={!account.ready || busy} title={account.error || (account.user ? 'Запазване в профила' : 'Запазване на това устройство')} aria-label={saved ? 'Премахни от запазените' : 'Запази автомобила'} aria-pressed={saved} onClick={async () => { setBusy(true); setError(''); try { await account.toggle(vehicle) } catch (e) { setError(e instanceof Error ? e.message : 'Неуспешно запазване.') } finally { setBusy(false) } }}><Heart size={variant === 'detail' ? 20 : 17} fill={saved ? 'currentColor' : 'none'} />{variant === 'detail' && <span>{saved ? 'Премахни от запазените' : 'Запази автомобила'}</span>}</button>{error && <span className="save-error" role="alert">{error}</span>}</span>
}
export function SaveAuction({ variant, ...vehicle }: SavedCar & { variant?: 'icon' | 'detail' }) { return <SaveVehicle variant={variant} vehicle={{ kind: 'auction', ...vehicle }} /> }
