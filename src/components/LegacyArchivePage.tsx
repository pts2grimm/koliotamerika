import { cache } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound, permanentRedirect } from 'next/navigation'
import { SiteLink as Link } from '@/components/SiteLink'
import { cms, mediaUrl, siteURL } from '@/lib/data'
import { archivePagePath, archiveTitle, resolveArchivePath } from '@/lib/legacy-archives'

const archiveData = cache(async (path: string) => {
  const resolved = resolveArchivePath(path)
  if (!resolved) notFound()
  const { archive, page, canonical } = resolved
  const articles = await (await cms()).find({
    collection: 'pages', overrideAccess: false, depth: 1,
    where: { and: [
      { kind: { equals: 'article' } },
      { or: [{ slug: { in: archive.slugs } }, { sourceURL: { in: archive.sourceURLs } }] },
    ] },
    sort: ['-publishedAt', '-id'], limit: 6, page,
  })
  // Do not expose an archive's historical titles when all its posts are private.
  if (!articles.totalDocs || page > articles.totalPages) notFound()
  if (path !== canonical) permanentRedirect(canonical)
  return { archive, page, canonical, articles }
})

export async function legacyArchiveMetadata(path: string): Promise<Metadata> {
  const { archive, page, canonical } = await archiveData(path)
  const title = archiveTitle(archive) + (page > 1 ? ' — страница ' + page : '')
  const description = archive.kind === 'author'
    ? 'Публикации от ' + archive.label + ' в блога на Коли от Америка.'
    : 'Материали по темата „' + archive.label + '“ — съвети, проверки и информация за автомобили от Америка.'
  return { title, description, alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website', locale: 'bg_BG' } }
}

export async function LegacyArchivePage({ path }: { path: string }) {
  const { archive, page, canonical, articles } = await archiveData(path)
  const title = archiveTitle(archive)
  const base = siteURL()
  const structuredData = {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: title, url: new URL(canonical, base).href, inLanguage: 'bg-BG',
    mainEntity: { '@type': 'ItemList', itemListElement: articles.docs.map((doc, index) => ({
      '@type': 'ListItem', position: (page - 1) * 6 + index + 1,
      name: doc.title, url: new URL('/' + doc.slug, base).href,
    })) },
  }
  return <div className="landing-page landing-journal">
    <div className="container"><nav className="landing-breadcrumbs" aria-label="Път до страницата">
      <Link href="/">Начало</Link><span aria-hidden="true">/</span><Link href="/blog">Блог</Link>
      <span aria-hidden="true">/</span><span aria-current="page">{archive.label}</span>
    </nav></div>
    <section className="container page-heading">
      <span className="eyebrow orange">БЛОГ / КОЛИ ОТ АМЕРИКА</span>
      <h1>{title}{page > 1 ? ' — страница ' + page : ''}</h1>
      <p>{archive.kind === 'author' ? 'Всички публикации на автора в този архив.' : 'Практични материали и новини по темата.'}</p>
    </section>
    <section className="container blog-section" aria-label="Публикации">
      <div className="journal-list-heading"><h2>Публикации</h2><span>{articles.totalDocs} статии</span></div>
      <div className="blog-grid">{articles.docs.map(article => {
        const image = mediaUrl(article.image) || article.legacyImage
        return <Link href={'/' + article.slug} className="blog-card" key={article.id}>
          {image && <div className="blog-image"><Image src={image} alt={article.title} fill sizes="(max-width:700px) 100vw,(max-width:1100px) 50vw,33vw" /></div>}
          <div><h2>{article.title}</h2><p>{article.intro.slice(0, 160)}{article.intro.length > 160 ? '…' : ''}</p>
            <span className="text-link">Прочети статията</span></div>
        </Link>
      })}</div>
      {articles.totalPages > 1 && <nav className="pagination" aria-label="Страници на архива">
        {articles.hasPrevPage && <Link className="button button-outline" href={archivePagePath(archive, page - 1)}>Предишна</Link>}
        <span>{page} / {articles.totalPages}</span>
        {articles.hasNextPage && <Link className="button button-outline" href={archivePagePath(archive, page + 1)}>Следваща</Link>}
      </nav>}
      <p><Link className="text-link" href="/blog">Всички статии в блога</Link></p>
    </section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
  </div>
}
