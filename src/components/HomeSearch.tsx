import { Search, SlidersHorizontal } from 'lucide-react'
import { MakeModelFields } from './MakeModelFields'

export function HomeSearch({ makes }: { makes: Record<string, string[]> }) {
  const latestYear = new Date().getUTCFullYear() + 1
  const years = Array.from({ length: latestYear - 1989 }, (_, index) => latestYear - index)
  return <div className="container finder-wrap" id="discover">
    <form className="finder" action="/targove" aria-label="Намери автомобил">
      <div className="finder-heading"><SlidersHorizontal size={23} /><div><strong>Какво ще караш утре?</strong><span>Открий своя автомобил.</span></div></div>
      <MakeModelFields makes={makes} />
      <label><span>Година от</span><select name="year_from" defaultValue=""><option value="">Без ограничение</option>{years.map(year => <option key={year} value={year}>{year}</option>)}</select></label>
      <button className="button button-dark" type="submit"><Search size={19} />Разгледай</button>
    </form>
  </div>
}
