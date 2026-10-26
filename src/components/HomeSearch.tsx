import type { HomeContent } from '@/lib/home-content'
import { AuctionSearchForm } from './AuctionSearchForm'
import { isEridanRoadMake } from '@/lib/auction-providers/eridan-scope'
import { SlidersHorizontal } from 'lucide-react'
import { MakeModelFields } from './MakeModelFields'

export function HomeSearch({ makes, content, eridan = false }: { makes: Record<string, string[]>; content?: HomeContent['search']; eridan?:boolean }) {
  const carMakes = eridan ? Object.fromEntries(Object.entries(makes).filter(([make]) => isEridanRoadMake(make, 'Automobile'))) : makes
  const latestYear = new Date().getUTCFullYear() + 1
  const years = Array.from({ length: latestYear - 1989 }, (_, index) => latestYear - index)
  return <div className="finder-wrap" id="discover">
    <AuctionSearchForm className="finder" action="/targove" label="Намери автомобил" buttonLabel={content?.button??"Разгледай"}>
      <div className="finder-heading"><SlidersHorizontal size={23} /><div><strong>{content?.title??"Търсенето започва тук."}</strong><span>{content?.eyebrow??"Марка. Модел. Твоят избор."}</span></div></div>
      <MakeModelFields makes={carMakes} modelsOnDemand={eridan} vehicleType={eridan ? 'Automobile' : undefined} />
      <label><span>Година от</span><select name="year_from" defaultValue=""><option value="">Без ограничение</option>{years.map(year => <option key={year} value={year}>{year}</option>)}</select></label>
    </AuctionSearchForm>
    <div className="popular-makes"><span>{content?.popularLabel??"ПОПУЛЯРЕН ИЗБОР"}</span>{(content?content.popular.map(x=>x.label):['BMW', 'Audi', 'Mercedes-Benz', 'Porsche', 'Toyota']).map(label => <a key={label} href={`/targove?make=${encodeURIComponent(Object.keys(makes).find(make => make.toLowerCase() === label.toLowerCase()) || label)}`}>{label}</a>)}</div>
  </div>
}
