import { CatalogActivity } from './CatalogActivity'
import { isPreview } from '@/lib/preview'
import { AuctionSearchForm } from './AuctionSearchForm'
import { canonicalEridanMake } from '@/lib/auction-providers/make-aliases'
import { SiteLink as Link } from '@/components/SiteLink'
import { redirect, notFound } from 'next/navigation'
import { Heart, X } from 'lucide-react'
import { auctionMakes, searchAuctions, lookupAuction, auctionProviderName } from '@/lib/auctions'
import { auctionFilterLabel, auctionResultsURL, readAuctionFilters, type AuctionQuery } from '@/lib/auction-filters'
import { siteURL } from '@/lib/data'
import { AuctionCard } from '@/components/AuctionCard'
import { AuctionFilters } from '@/components/AuctionFilters'
import { unsupportedEridanFilters, UnsupportedEridanFilterError, EridanSearchLimitError } from '@/lib/auction-providers/eridan'
import { AuctionSort } from '@/components/AuctionSort'
import { auctionSectionPath, auctionSectionRedirect, sectionFilters, sectionVehicleType, type AuctionSection } from '@/lib/auction-sections'
import { PowersportsSEO } from '@/components/PowersportsSEO'
import { AuctionSEO } from '@/components/AuctionSEO'

type Props = { searchParams: Promise<AuctionQuery> }
const defaultTitle = 'Търгове за коли от Америка — Copart и IAAI'
const defaultDescription = 'Разгледай търгове за коли от Америка в Copart и IAAI. Избери марка, модел и година, сравни снимки и щети и планирай вноса до България.'
const getPage = (input: AuctionQuery) => Math.max(1, Math.min(10000, Math.floor(Number(input.pagenum) || 1)))

export async function AuctionCatalogue({ searchParams, archive = false, section = 'cars' }: Props & { archive?: boolean; section?: AuctionSection }) {
  if (archive && auctionProviderName() !== 'eridan') redirect('/targove')
  if (section === 'powersports' && auctionProviderName() !== 'eridan') notFound()
  const input = await searchParams
  if (auctionProviderName() === 'eridan') {
    const target = auctionSectionRedirect(input,section,archive)
    if (target) redirect(target)
  }
  const moto = section === 'powersports'
  const basePath = auctionSectionPath(section,archive)
  const pageTitle = archive ? (moto ? 'Архив на търговете за мотори и ATV' : 'Архив на търговете') : moto ? 'Търгове за мотори и ATV от Америка' : 'Търгове за коли от Америка'
  const pageDescription = moto ? 'Разгледай мотори, ATV и UTV от Copart и IAAI. Избери вид, марка, модел и година и сравни наличните обяви.' : defaultDescription
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
  const initial = auctionProviderName() === 'eridan' ? sectionFilters(input,section) : readAuctionFilters(input)
  if (auctionProviderName() === 'eridan' && initial.make) initial.make = canonicalEridanMake(initial.make)
  if (auctionProviderName() !== 'eridan') delete initial.sort
  const filterEntries = Object.entries(initial).filter(([key]) => key !== 'sort')
  const page = getPage(input)
  const params = new URLSearchParams({ size: '12', page: String(page), ...(auctionProviderName() === 'eridan' ? {} : { vehicle_type: 'Automobile' }), site: '1,2', ...initial, ...(auctionProviderName() === 'eridan' ? {vehicle_type: sectionVehicleType(section,initial.vehicle_type)} : {}), ...(archive ? {archive: 'ended'} : {}) })
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
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: pageTitle,
    url: `${siteURL()}${resultsURL(initial, page)}`, description: pageDescription,
    breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Начало', item: siteURL() }, { '@type': 'ListItem', position: 2, name: pageTitle, item: `${siteURL()}${basePath}` }] },
    ...(data?.items.length ? { mainEntity: { '@type': 'ItemList', itemListElement: data.items.map((car, index) => ({ '@type': 'ListItem', position: index + 1, name: car.title, url: `${siteURL()}/targove/kola?lot=${car.lot_id}&site=${car.site}` })) } } : {}),
  }
  return <>
    {page === 1 && <CatalogActivity enabled={!isPreview()} data={{
      kind: 'search', section, archive, make: initial.make, model: initial.model,
      yearFrom: initial.year_from, yearTo: initial.year_to,
      query: typeof input.q === 'string' && /^(?:[0-9]{6,12}|[A-HJ-NPR-Z0-9]{17})$/.test(input.q.trim().toUpperCase()) ? input.q.trim().toUpperCase() : undefined,
      filters: Object.fromEntries(Object.entries(initial).filter(([key]) => key !== 'seller')),
      outcome: !data ? 'error' : data.items.length ? 'results' : 'empty',
      resultCount: data?.total ?? undefined,
    }} />}
    <section className="page-heading container auction-heading"><div><span className="eyebrow orange">COPART / IAAI</span><h1>{pageTitle}</h1><p>{archive ? 'Обяви с минала дата на търга. „Продаден“ означава потвърдена продажба от доставчика; за останалите резултатът не е потвърден. Това не са наши реализирани сделки.' : moto ? pageDescription : 'Избери марка и модел. Сравни автомобилите и планирай следващата стъпка.'}</p></div><Link className="text-link" href="/targove/zapazeni"><Heart size={17} />Запазени автомобили</Link></section>
    <section className="container catalogue-list auction-catalogue">
      {auctionProviderName() === 'eridan' && <>
        <nav className="archive-navigation" aria-label="Категории търгове"><Link className="button button-outline" aria-current={!moto ? 'page' : undefined} href={auctionSectionPath('cars',archive)}>Коли</Link><Link className="button button-outline" aria-current={moto ? 'page' : undefined} href={auctionSectionPath('powersports',archive)}>Мотори и ATV</Link></nav>
        <nav className="archive-navigation" aria-label="Активни и архивни автомобили"><Link className="text-link" aria-current={!archive ? 'page' : undefined} href={auctionSectionPath(section)}>Активни търгове</Link><Link className="text-link" aria-current={archive ? 'page' : undefined} href={auctionSectionPath(section,true)}>Архив</Link></nav>
      </>}
      <AuctionSearchForm className="lot-search" action={basePath} label="Търсене по номер" buttonLabel="Намери" outlined><label>Имаш номер на лот или VIN?<input name="q" maxLength={17} placeholder="Въведи номер на лот или VIN" defaultValue={typeof input.q === 'string' ? input.q : ''} /></label></AuctionSearchForm>
      {lookupError && <p className="form-error" role="alert">{lookupError}</p>}
      <div className="auction-browse-layout"><AuctionFilters section={section} basePath={basePath} key={JSON.stringify(initial)} makes={makes} initial={initial} modelsOnDemand={auctionProviderName() === 'eridan'} eridan={auctionProviderName() === 'eridan'} unavailableFilters={[]} />
      <div className="auction-results"><div className="results-count"><span>{data ? data.total !== null ? <><strong>{data.total.toLocaleString('bg-BG')}</strong> резултата</> : moto ? 'Намерени мотори и ATV' : 'Намерени автомобили' : 'Данните временно не са достъпни.'}</span><span>{archive ? 'Търгове с минала дата. Резултатът е посочен, когато е потвърден.' : 'Текущите залози не включват разходите за внос.'}</span></div>
      {auctionProviderName() === 'eridan' && <AuctionSort key={JSON.stringify(initial)} initial={initial} basePath={basePath} archive={archive} />}
      {filterEntries.length > 0 && <nav className="active-filters" aria-label="Активни филтри">{filterEntries.map(([key, value]) => <Link key={key} href={removeFilter(key)} aria-label={`Премахни филтър: ${auctionFilterLabel(key, value)}`}>{auctionFilterLabel(key, value)}<X size={14} /></Link>)}<Link className="clear-filters" href={basePath}>Изчисти всички</Link></nav>}
      {data?.items.length ? <div className="car-grid">{data.items.map(car => <AuctionCard key={car.id} car={car} />)}</div> : <div className="empty-state"><h2>{scanLimited ? 'Уточни търсенето.' : data ? (moto ? 'Няма мотори или ATV по тези критерии.' : 'Няма автомобили по тези критерии.') : 'В момента търговете не се зареждат.'}</h2><p>{filterError || (data ? 'Промени филтрите или ни изпрати запитване.' : 'Опитай отново малко по-късно или се свържи с нас за конкретен автомобил.')}</p>{!data && !filterError && <a className="button button-outline" href={resultsURL(initial, page)}>Опитай отново</a>}<Link className="button button-orange" href="/kontakti">Изпрати запитване</Link></div>}
      {data && (page > 1 || hasNext) && <nav className="pagination" aria-label="Страници с търгове">{page > 1 && <Link className="button button-outline" href={resultsURL(initial, page - 1)}>Предишна</Link>}<span>{maxPage === null ? `Страница ${page}` : `${page} / ${maxPage}`}</span>{hasNext && <Link className="button button-outline" href={resultsURL(initial, page + 1)}>Следваща</Link>}</nav>}
      </div></div>
      {!archive && page === 1 && !Object.keys(initial).length && !input.q && (moto ? <PowersportsSEO /> : <AuctionSEO />)}
    </section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
  </>
}
