import type { AuctionCar } from '@/lib/auction-providers/types'
import { DetailTooltip } from './DetailTooltip'
import { documentHint, mileage, sellerHint, statusHint } from '@/lib/vehicle-details'
import type { ReactNode } from 'react'

function Facts({ title, rows, className = '' }: { title: string; rows: [string, ReactNode][]; className?: string }) {
 const present = rows.filter(([, value]) => value != null && value !== '')
 if (!present.length) return null
 return <section className={`vehicle-facts ${className}`}><h2>{title}</h2><dl className="spec-table">{present.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></section>
}
export function TechnicalFacts({ car }: { car: AuctionCar }) {
 return <Facts title="Технически характеристики" className="technical-facts" rows={[
  ['Година', car.year || undefined], ['Пробег', mileage(car.odometer, car.odometer_unit)], ['Двигател', car.engine], ['Гориво', car.fuel], ['Скоростна кутия', car.transmission], ['Задвижване', car.drive],
 ]} />
}
export function AuctionFacts({ car }: { car: AuctionCar }) {
 return <Facts title="Информация за автомобила" rows={[
  ['VIN код', car.vin], ['Lot ID', car.lot_id], ['Щат', car.state], ['Местоположение', car.location],
  ['Състояние', car.status ? <DetailTooltip {...statusHint(car.status)} /> : undefined],
  ['Обозначение на аукциона', car.enhanced ? <DetailTooltip label="Enhanced Vehicles" text="Това обозначение не потвърждава, че автомобилът пали или се движи. Провери техническото състояние отделно." tone="neutral" /> : undefined],
  ['Документ', car.document_old ? <DetailTooltip {...documentHint(car.document_old)} /> : undefined],
  ['Продавач', car.seller], ['Тип продавач', car.seller_type ? <DetailTooltip {...sellerHint(car.seller_type)} /> : undefined],
 ]} />
}
export function DamageFacts({ car }: { car: AuctionCar }) {
 return <Facts title="Щети" className="damage-facts" rows={[
  ['Основни щети', car.damage_pr], ['Вторични щети', car.damage_sec],
 ]} />
}
