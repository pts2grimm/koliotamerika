export function blogPage(value: string | string[] | undefined): number | null {
  if (value === undefined) return 1
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null
  const page = Number(value)
  return Number.isSafeInteger(page) ? page : null
}
export const blogPath = (page: number) => page === 1 ? '/blog' : '/blog?page=' + page
export function isoDate(value?: string | null) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}
export function articleStructuredData(article: {
  title: string; slug: string; intro: string; publishedAt?: string | null;
  updatedAt?: string | null; sourceURL?: string | null
}, base: string, brand: string, image?: string) {
  const url = new URL('/' + article.slug, base).href
  const published = isoDate(article.publishedAt)
  // Database import time is not an editorial update to a legacy article.
  const modified = article.sourceURL ? undefined : isoDate(article.updatedAt)
  return {
    '@context': 'https://schema.org',
    '@graph': [{
      '@type': 'BlogPosting', '@id': url + '#article', headline: article.title,
      description: article.intro, url, mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      inLanguage: 'bg-BG',
      publisher: { '@type': 'Organization', name: brand, url: base },
      ...(!article.sourceURL ? { author: { '@type': 'Organization', name: brand, url: base } } : {}),
      ...(published ? { datePublished: published } : {}),
      ...(modified ? { dateModified: modified } : {}),
      ...(image ? { image: [new URL(image, base).href] } : {}),
    }, {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Начало', item: base },
        { '@type': 'ListItem', position: 2, name: 'Блог', item: new URL('/blog', base).href },
        { '@type': 'ListItem', position: 3, name: article.title, item: url },
      ],
    }] as const,
  }
}
