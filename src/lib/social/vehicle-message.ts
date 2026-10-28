import type { AuctionCar } from '../auction-providers/types'
import { auctionSchedule, parseAuctionDate } from '../auction-schedule'
import { mileage } from '../vehicle-details'

function clean(value: string | null | undefined, limit = 120) {
 return (value || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit)
}

const damages: Record<string, string> = {
 'FRONT END': 'Предна част', 'REAR END': 'Задна част', SIDE: 'Странични щети',
 'MINOR DENT/SCRATCHES': 'Вдлъбнатини / драскотини', 'ALL OVER': 'По целия автомобил',
 HAIL: 'Градушка', 'WATER/FLOOD': 'Вода / наводнение', ROLLOVER: 'Преобръщане',
 'MECHANICAL': 'Механични повреди', 'NORMAL WEAR': 'Нормално износване',
}
const fuels: Record<string, string> = {
 GAS: 'Бензин', GASOLINE: 'Бензин', PETROL: 'Бензин', DIESEL: 'Дизел',
 ELECTRIC: 'Електрически', HYBRID: 'Хибрид',
}
const transmissions: Record<string, string> = {
 AUTOMATIC: 'Автоматична скоростна кутия', MANUAL: 'Ръчна скоростна кутия',
}
function label(value: string | undefined, labels: Record<string, string>) {
 const raw = clean(value)
 if (!raw || /^(UNKNOWN|N\/A|NOT SPECIFIED|UNSPECIFIED|NONE|NULL|-)$/i.test(raw)) return ''
 return labels[raw.toUpperCase()] || raw
}

// Only supplied auction facts. Bids and retail estimates are not landed prices.
export function vehiclePostMessage(car: AuctionCar, phone?: string | null, now = Date.now()) {
 const specs = [
  clean(car.engine, 60),
  label(car.fuel, fuels),
  label(car.transmission, transmissions),
 ].filter(Boolean)
 const lines = ['🚘 ' + clean(car.title, 200), '']
 if (specs.length) lines.push('⚙️ ' + specs.join(' · '))
 const distance = mileage(car.odometer, car.odometer_unit || 'unknown')
 if (distance) lines.push('🛣️ Показание на километража: ' + distance)
 const damage = [...new Set([label(car.damage_pr, damages), label(car.damage_sec, damages)].filter(Boolean))]
 if (damage.length) lines.push('🔧 Посочени щети: ' + damage.join(' · '))
 const schedule = auctionSchedule(parseAuctionDate(car.auction_date), now, car.auction_status)
 if (schedule.state === 'upcoming') {
  lines.push('📅 Търг: ' + schedule.date + ' · ' + schedule.time + ' ч. (българско време)')
 } else {
  lines.push('📅 Датата на търга се уточнява')
 }
 lines.push('🏷️ ' + (car.site === 1 ? 'Copart' : 'IAAI') + ' · Лот ' + car.lot_id)
 lines.push('', '🇧🇬 Харесва ти? Поискай конкретна оферта за внос до България.')
 const contact = clean(phone, 50)
 if (contact && /^[+\d ()/.-]+$/.test(contact) && contact.replace(/\D/g, '').length >= 7) {
  lines.push('📞 ' + contact)
 } else {
  lines.push('💬 Пиши ни за повече информация.')
 }
 lines.push('', '👇 Виж снимките и всички детайли в обявата.',
  'Данните са от аукциона и могат да се променят. Състоянието подлежи на проверка.')
 return lines.join('\n')
}
