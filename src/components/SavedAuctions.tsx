'use client'
import { SiteLink as Link } from '@/components/SiteLink'
import { ArrowUpRight } from 'lucide-react'
import { SaveVehicle } from './SaveAuction'
import { useAccount } from './AccountProvider'
import { vehicleKey, vehicleURL } from '@/lib/account-validation'
export function SavedAuctions() {
 const { saved, ready, error, user } = useAccount()
 return <div className="saved-list">{error && <p role="alert">{error}</p>}{!ready && !error && <p role="status">Зареждане…</p>}{ready && <p className="muted">{user ? 'Автомобилите са запазени в профила ти и са достъпни от всяко устройство.' : <>Автомобилите се пазят на това устройство. <Link href="/vhod">Влез в профил</Link>, за да ги виждаш и от друго устройство.</>}</p>}{ready && !saved.length && <div className="empty-state"><h2>Все още нямаш запазени автомобили.</h2><p>Натисни сърцето върху автомобил в каталога.</p><Link className="button button-dark" href="/targove">Разгледай търговете</Link></div>}{saved.map(car => <div className="saved-item" key={vehicleKey(car)}><Link href={vehicleURL(car)}><span className="eyebrow orange">{car.kind === 'auction' ? `${car.site === '1' ? 'COPART' : 'IAAI'} · ЛОТ ${car.lot}` : 'АВТОМОБИЛ ОТ КАТАЛОГА'}</span><h2>{car.title}</h2><span className="text-link">Виж актуалните данни <ArrowUpRight size={17} /></span></Link><SaveVehicle vehicle={car} /></div>)}</div>
}
