import type { Page } from '../payload-types'

const services = new Set(['vnos-na-koli-ot-usa', 'homologacia', 'proverka-na-istoriya-na-avtomobil', 'vnos-na-motori-ot-sasht'])
export function landingStructuredData(page: Pick<Page, 'title' | 'intro' | 'slug'>, base: string, brand: string) {
 const url = new URL('/' + page.slug, base).href
 return {
  '@context': 'https://schema.org',
  '@graph': [
   {
    '@type': 'WebPage', '@id': url + '#webpage', url, name: page.title, description: page.intro, inLanguage: 'bg-BG',
    ...(services.has(page.slug) ? { mainEntity: {
     '@type': 'Service', '@id': url + '#service', name: page.title, description: page.intro, url,
     provider: { '@type': 'Organization', name: brand, url: base },
    } } : {}),
   },
   { '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Начало', item: new URL('/', base).href },
    { '@type': 'ListItem', position: 2, name: page.title, item: url },
   ] },
  ] as const,
 }
}

const importPath = '/vnos-na-koli-ot-usa'
const pricePath = importPath + '/vnos-na-koli-ot-amerika-cena'
const labels: Record<string, string> = {
 [importPath]: 'Внос на коли от САЩ и Канада',
 [pricePath]: 'Разходи и такси при внос на кола',
 '/proverka-na-istoriya-na-avtomobil': 'Проверка по VIN преди покупката',
 '/homologacia': 'Хомологация преди регистрацията',
 '/kak-rabotim': 'Стъпки от избора до доставката',
 '/aukcioni-za-koli-v-amerika': 'Как да разчетеш термините в обявата',
 '/kalkulator': 'Изчисли ориентировъчния бюджет',
 '/targove': 'Разгледай автомобилите на търг',
 '/chesto-zadavani-vuprosi': 'Въпроси преди покупката',
}
export function landingRelatedLinks(slug: string) {
 const routes: Record<string, string[]> = {
  'vnos-na-koli-ot-usa': [pricePath, '/proverka-na-istoriya-na-avtomobil', '/kak-rabotim'],
  'vnos-na-koli-ot-usa/vnos-na-koli-ot-amerika-cena': ['/kalkulator', importPath, '/homologacia'],
  'uslugi': ['/kak-rabotim', pricePath, '/chesto-zadavani-vuprosi'],
  'kak-rabotim': ['/proverka-na-istoriya-na-avtomobil', pricePath, '/homologacia'],
  'homologacia': [importPath, pricePath, '/chesto-zadavani-vuprosi'],
  'proverka-na-istoriya-na-avtomobil': ['/aukcioni-za-koli-v-amerika', '/targove', importPath],
  'aukcioni-za-koli-v-amerika': ['/proverka-na-istoriya-na-avtomobil', '/targove', importPath],
  'vnos-na-motori-ot-sasht': ['/aukcioni-za-koli-v-amerika', '/kak-rabotim', '/chesto-zadavani-vuprosi'],
 }
 return (routes[slug] || [importPath, pricePath, '/kalkulator']).map(href => ({ href, label: labels[href] }))
}
