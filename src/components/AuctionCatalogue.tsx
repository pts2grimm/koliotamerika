import { SiteLink as Link } from '@/components/SiteLink'
import { redirect } from 'next/navigation'
import { Heart, Search, X } from 'lucide-react'
import { auctionMakes, searchAuctions, lookupAuction, auctionProviderName } from '@/lib/auctions'
import { auctionFilterLabel, auctionResultsURL, readAuctionFilters, type AuctionQuery } from '@/lib/auction-filters'
import { siteURL } from '@/lib/data'
import { AuctionCard } from '@/components/AuctionCard'
import { AuctionFilters } from '@/components/AuctionFilters'
import { unsupportedEridanFilters, UnsupportedEridanFilterError, EridanSearchLimitError } from '@/lib/auction-providers/eridan'
import { AuctionSEO } from '@/components/AuctionSEO'

type Props = { searchParams: Promise<AuctionQuery> }
const defaultTitle = 'Търгове за коли от Америка — Copart и IAAI'
const defaultDescription = 'Разгледай търгове за коли от Америка в Copart и IAAI. Избери марка, модел и година, сравни снимки и щети и планирай вноса до България.'
const getPage = (input: AuctionQuery) => Math.max(1, Math.min(10000, Math.floor(Number(input.pagenum) || 1)))

export async function AuctionCatalogue({ searchParams, archive = false }: Props & { archive?: boolean }) {
  if (archive && auctionProviderName() !== 'eridan') redirect('/targove')
  const input = await searchParams
  const basePath = archive ? '/targove/arhiv' : '/targove'
  const resultsURL = (filters: Record<string,string>, page = 1) => auctionResultsURL(filters, page, basePath)
  let lookupError = ''
  if (typeof input.q === 'string' && input.q.trim()) {
    const q = input.q.trim().toUpperCase()
    if (/^(?:[0-9]{6,12}|[A-HJ-NPR-Z0-9]{17})$/.test(q)) {
      let found
      try { found = await lookupAuction(q,archive) } catch { lookupError = 'Не намерихме съответстваща обява в избрания раздел или доставчикът временно не отговаря. Провери номера и опитай отново.' }
      if (found && /^\d+$/.test(found.lot) && ['1', '2'].includes(found.site)) redirect(`/targove/kola?lot=${found.lot}&site=${found.site}`)
    } else lookupError = 'Въведи номер на лот (6–12 цифри) или валиден 17-символен VIN.'
  }
  const initial = readAuctionFilters(input)
  const page = getPage(input)
  const params = new URLSearchParams({ size: '12', page: String(page), ...(auctionProviderName() === 'eridan' ? {} : { vehicle_type: 'Automobile' }), site: '1,2', ...initial, ...(archive ? {archive: 'ended'} : {}) })
  const [carsResult, makesResult] = await Promise.allSettled([searchAuctions(params.toString()), auctionMakes()])
  const data = carsResult.status === 'fulfilled' ? carsResult.value : null
  const makes = makesResult.status === 'fulfilled' ? makesResult.value : {}
  const maxPage = data?.totalPages ?? null
  const hasNext = data?.hasNext ?? (maxPage !== null && page < maxPage)
  const unsupported = auctionProviderName() === 'eridan' ? carsResult.status === 'rejected' && carsResult.reason instanceof UnsupportedEridanFilterError ? carsResult.reason.filters : unsupportedEridanFilters(params) : []
  const scanLimited = carsResult.status === 'rejected' && carsResult.reason instanceof EridanSearchLimitError
  const filterError = scanLimited ? 'Търсенето е твърде широко. Избери марка, модел или по-тесен период по години и опитай отново.' : !data && unsupported.length ? 'Търсенето по ' + unsupported.map(key => (({ status: 'състояние', seller_type: 'тип продавач', seller: 'име на продавач (поне 2 символа)', cylinders: 'брой цилиндри', fuel: 'гориво', vehicle_type: 'тип автомобил' } as Record<string, string>)[key])).join(' и ') + ' временно не е достъпно. Премахни този филтър, за да разгледаш автомобилите.' : ''
  const removeFilter = (key: string) => { const next = { ...initial }; delete next[key]; if (key === 'make') delete next.model; return resultsURL(next) }
  const schema = {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: archive ? 'Архив на търговете' : defaultTitle,
    url: `${siteURL()}${resultsURL(initial, page)}`, description: defaultDescription,
    breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Начало', item: siteURL() }, { '@type': 'ListItem', position: 2, name: 'Търгове', item: `${siteURL()}/targove` }] },
    ...(data?.items.length ? { mainEntity: { '@type': 'ItemList', itemListElement: data.items.map((car, index) => ({ '@type': 'ListItem', position: index + 1, name: car.title, url: `${siteURL()}/targove/kola?lot=${car.lot_id}&site=${car.site}` })) } } : {}),
  }
  return <>
    <section className="page-heading container auction-heading"><div><span className="eyebrow orange">COPART / IAAI</span><h1>{archive ? 'Архив на търговете' : 'Търгове за коли от Америка'}</h1><p>{archive ? 'Обяви с минала дата на търга. „Продаден“ означава потвърдена продажба от доставчика; за останалите резултатът не е потвърден. Това не са наши реализирани сделки.' : 'Избери марка и модел. Сравни автомобилите и планирай следващата стъпка.'}</p></div><Link className="text-link" href="/targove/zapazeni"><Heart size={17} />Запазени автомобили</Link></section>
    <section className="container catalogue-list auction-catalogue">
      {auctionProviderName() === 'eridan' && <nav className="archive-navigation" aria-label="Активни и архивни автомобили"><Link className="button button-outline" aria-current={!archive ? 'page' : undefined} href="/targove">Активни търгове</Link><Link className="button button-outline" aria-current={archive ? 'page' : undefined} href="/targove/arhiv">Архив</Link></nav>}
      <form className="lot-search" action={basePath} aria-label="Търсене по номер"><label>Имаш номер на лот или VIN?<input name="q" maxLength={17} placeholder="Въведи номер на лот или VIN" defaultValue={typeof input.q === 'string' ? input.q : ''} /></label><button className="button button-outline" type="submit"><Search size={17} />Намери</button></form>
      {lookupError && <p className="form-error" role="alert">{lookupError}</p>}
      <div className="auction-browse-layout"><AuctionFilters basePath={basePath} key={JSON.stringify(initial)} makes={makes} initial={initial} modelsOnDemand={auctionProviderName() === 'eridan'} eridan={auctionProviderName() === 'eridan'} unavailableFilters={[]} />
      <div className="auction-results"><div className="results-count"><span>{data ? data.total !== null ? <><strong>{data.total.toLocaleString('bg-BG')}</strong> резултата</> : 'Намерени автомобили' : 'Данните временно не са достъпни.'}</span><span>{archive ? 'Търгове с минала дата. Резултатът е посочен, когато е потвърден.' : 'Текущите залози не включват разходите за внос.'}</span></div>
      {Object.keys(initial).length > 0 && <nav className="active-filters" aria-label="Активни филтри">{Object.entries(initial).map(([key, value]) => <Link key={key} href={removeFilter(key)} aria-label={`Премахни филтър: ${auctionFilterLabel(key, value)}`}>{auctionFilterLabel(key, value)}<X size={14} /></Link>)}<Link className="clear-filters" href={basePath}>Изчисти всички</Link></nav>}
      {data?.items.length ? <div className="car-grid">{data.items.map(car => <AuctionCard key={car.id} car={car} />)}</div> : <div className="empty-state"><h2>{scanLimited ? 'Уточни търсенето.' : data ? 'Няма автомобили по тези критерии.' : 'В момента търговете не се зареждат.'}</h2><p>{filterError || (data ? 'Промени филтрите или ни изпрати запитване.' : 'Опитай отново малко по-късно или се свържи с нас за конкретен автомобил.')}</p>{!data && !filterError && <a className="button button-outline" href={resultsURL(initial, page)}>Опитай отново</a>}<Link className="button button-orange" href="/kontakti">Изпрати запитване</Link></div>}
      {data && (page > 1 || hasNext) && <nav className="pagination" aria-label="Страници с търгове">{page > 1 && <Link className="button button-outline" href={resultsURL(initial, page - 1)}>Предишна</Link>}<span>{maxPage === null ? `Страница ${page}` : `${page} / ${maxPage}`}</span>{hasNext && <Link className="button button-outline" href={resultsURL(initial, page + 1)}>Следваща</Link>}</nav>}
      </div></div>
      {!archive && page === 1 && !Object.keys(initial).length && !input.q && <AuctionSEO />}
    </section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
  </>
}
