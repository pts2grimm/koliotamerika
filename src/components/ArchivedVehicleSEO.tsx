import type { AuctionCar } from '@/lib/auction-providers/types'
import { archivedVehicleData } from '@/lib/auction-seo'
import { auctionImages } from '@/lib/auctions'
import { siteURL } from '@/lib/data'
import { SiteLink as Link } from './SiteLink'

export function ArchivedVehicleSEO({car}:{car:AuctionCar}) {
 const archive=(car.vehicle_type==='Motorcycle'||car.vehicle_type==='ATVUTV'?'/targove/motori-atv':'/targove')+'/arhiv'
 const auction=car.site===1?'Copart':'IAAI'
 const date=car.auction_date&&Number.isFinite(Date.parse(car.auction_date))?new Date(car.auction_date):null
 return <section className="vehicle-seo" aria-labelledby="archived-vehicle-heading">
  <h2 id="archived-vehicle-heading">{car.title} — архив на {auction}</h2>
  <p>Архивна обява за <strong>{car.title}</strong>, лот <strong>{car.lot_id}</strong> в {auction}.
   {car.vin&&<> Предоставен VIN: <strong>{car.vin}</strong>.</>}
   {date&&<> Посочена дата на търга: <time dateTime={date.toISOString()}>{new Intl.DateTimeFormat('bg-BG',{dateStyle:'long',timeStyle:'short',timeZone:'Europe/Sofia'}).format(date)}</time> (българско време).</>}
  </p>
  <p>{car.auction_status==='sold'?'Доставчикът отбелязва автомобила като продаден.':'Датата на търга е минала, но доставчикът не е потвърдил продажба.'} Обявата не предлага текущо участие в търг и не представя наша реализирана сделка. Снимките и описанието отразяват предоставените аукционни данни и не удостоверяват сегашното състояние.</p>
  <p>Разгледай <Link href={archive}>останалите архивни обяви</Link> или прочети за <Link href="/proverka-na-istoriya-na-avtomobil">проверката на историята по VIN</Link>.</p>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(archivedVehicleData(car,siteURL(),auctionImages(car))).replace(/</g,'\\u003c')}}/>
 </section>
}
