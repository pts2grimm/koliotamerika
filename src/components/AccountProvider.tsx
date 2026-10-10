'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { vehicleInput, vehicleKey, type SavedVehicle } from '@/lib/account-validation'
export type CustomerProfile = { id: number; name: string; email: string; phone: string }
export const savedKey = 'koa-saved-auctions'
export function readSaved(): SavedVehicle[] {
 try { const data = JSON.parse(localStorage.getItem(savedKey) || '[]'); return Array.isArray(data) ? data.map(vehicleInput).filter((v): v is SavedVehicle => !!v).slice(0, 100) : [] } catch { return [] }
}
export async function accountAction(action: string, data: unknown = {}) {
 const response = await fetch(`/api/account/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
 const result = await response.json()
 if (!response.ok) throw new Error(result.error || 'Действието не беше завършено.')
 return result
}
type AccountContext = { enabled: boolean; recovery: boolean; user: CustomerProfile | null; saved: SavedVehicle[]; ready: boolean; error: string; refresh: () => Promise<void>; toggle: (vehicle: SavedVehicle) => Promise<void> }
const Context = createContext<AccountContext | null>(null)
export function AccountProvider({ enabled, recovery, children }: { enabled: boolean; recovery: boolean; children: React.ReactNode }) {
 const [user, setUser] = useState<CustomerProfile | null>(null)
 const [saved, setSaved] = useState<SavedVehicle[]>([])
 const [ready, setReady] = useState(false)
 const [error, setError] = useState('')
 const refresh = useCallback(async () => {
  try {
   if (enabled) {
    const response = await fetch('/api/account', { cache: 'no-store' }); if (!response.ok) throw new Error('Профилът не може да се зареди. Обнови страницата, за да опиташ отново.')
    const data = await response.json(); setUser(data.user); setSaved(data.user ? data.saved : readSaved())
   } else { setUser(null); setSaved(readSaved()) }
   setError(''); setReady(true)
  } catch (e) { setReady(false); setError(e instanceof Error ? e.message : 'Проблем при зареждане.') }
 }, [enabled])
 useEffect(() => {
  void refresh()
  const update = () => { void refresh() }
  const storage = (e: StorageEvent) => { if (e.key === savedKey || e.key === 'koa-account-update') update() }
  window.addEventListener('koa-saved', update); window.addEventListener('storage', storage); window.addEventListener('focus', update)
  return () => { window.removeEventListener('koa-saved', update); window.removeEventListener('storage', storage); window.removeEventListener('focus', update) }
 }, [refresh])
 async function toggle(vehicle: SavedVehicle) {
  if (!ready) throw new Error(error || 'Изчакай зареждането на профила.')
  const exists = saved.some(v => vehicleKey(v) === vehicleKey(vehicle))
  if (user) { await accountAction(exists ? 'remove' : 'save', { vehicle }); await refresh() }
  else {
   const current = readSaved()
   if (!exists && current.length >= 100) throw new Error('Можеш да запазиш до 100 автомобила.')
   localStorage.setItem(savedKey, JSON.stringify(exists ? current.filter(v => vehicleKey(v) !== vehicleKey(vehicle)) : [...current, vehicle]))
   window.dispatchEvent(new Event('koa-saved'))
  }
 }
 return <Context.Provider value={{ enabled, recovery, user, saved, ready, error, refresh, toggle }}>{children}</Context.Provider>
}
export function useAccount() { const context = useContext(Context); if (!context) throw new Error('Missing AccountProvider'); return context }
export function announceAccountChange() { try { localStorage.setItem('koa-account-update', String(Date.now())) } catch { /* Session remains usable without local storage. */ } }
