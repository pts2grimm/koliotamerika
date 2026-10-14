import Image from 'next/image'
import type { Page } from '@/payload-types'
import { SiteLink as Link } from '@/components/SiteLink'
import { EditorialContent } from '@/components/EditorialContent'
import { LegacyExamples } from '@/components/LegacyExamples'
import { editorialImage } from '@/lib/editorial-images'
import { imageAlt, mediaUrl } from '@/lib/data'
import { isoDate } from '@/lib/blog-seo'

const dateLabel = (date: string) => new Intl.DateTimeFormat('bg-BG', {
  dateStyle: 'long', timeZone: 'Europe/Sofia',
}).format(new Date(date))

type Props = {
  page: Page
  brand: string
  reviewedAt?: string
  topics: { path: string; label: string }[]
  more: Page[]
}

export function BlogArticle({ page, brand, reviewedAt, topics, more }: Props) {
  const cover = editorialImage(page.slug, mediaUrl(page.image), page.legacyImage)
  const published = isoDate(page.publishedAt)
  return <div className="blog-article">
    <div className="container">
      <nav className="landing-breadcrumbs" aria-label="Път до страницата">
        <Link href="/">Начало</Link><span aria-hidden="true">/</span>
        <Link href="/blog">Блог</Link><span aria-hidden="true">/</span>
        <span aria-current="page">{page.title}</span>
      </nav>
    </div>
    <header className="blog-article-heading container">
      <Link className="blog-article-label" href="/blog">БЛОГ · КОЛИ ОТ АМЕРИКА</Link>
      {page.eyebrow && <span className="blog-article-kicker">{page.eyebrow}</span>}
      <h1>{page.title}</h1>
      <p className="blog-article-intro">{page.intro}</p>
      <div className="article-meta">
        <span className="blog-article-byline">{page.sourceURL ? 'Публикация в' : 'От редакцията на'} {brand}</span>
        {published && <span>Публикувано на <time dateTime={published}>{dateLabel(published)}</time></span>}
        {reviewedAt && <span>Прегледано на <time dateTime={reviewedAt}>{dateLabel(reviewedAt)}</time></span>}
      </div>
    </header>
    {cover.src && <figure className="container editorial-image blog-article-cover">
      <Image src={cover.src} alt={imageAlt(page.image, cover.artwork?.alt || page.title)}
        width={cover.artwork?.width || 1400} height={cover.artwork?.height || 700}
        sizes="(max-width: 760px) calc(100vw - 40px), 600px" preload />
      {cover.artwork && <figcaption className="editorial-caption">{cover.artwork.caption}</figcaption>}
    </figure>}
    <article className="article-body container">
      {page.body && <EditorialContent data={page.body} />}
      {page.sections?.map((section, i) => <section key={section.id || i}>
        <h2>{section.heading}</h2>
        {section.body.split(/\n\s*\n/).map((paragraph, j) => <p key={j}>{paragraph}</p>)}
      </section>)}
    </article>
    <LegacyExamples slug={page.slug} />
    <footer className="blog-article-end container">
      {topics.length > 0 && <nav aria-label="Теми на статията" className="blog-article-topics">
        <span>Още по темата</span>
        <ul>{topics.map(topic => <li key={topic.path}><Link href={topic.path}>{topic.label}</Link></li>)}</ul>
      </nav>}
      <Link className="blog-article-back" href="/blog"><span aria-hidden="true">←</span> Всички статии в блога</Link>
    </footer>
    {more.length > 0 && <aside className="blog-article-related container" aria-labelledby="related-articles">
      <div className="blog-article-related-heading">
        <div><span className="eyebrow orange">ПРОДЪЛЖИ С ПОЛЕЗНОТО</span><h2 id="related-articles">Още от блога</h2></div>
        <Link className="text-link" href="/blog">Разгледай всички <span aria-hidden="true">↗</span></Link>
      </div>
      <div className="blog-article-cards">{more.map(item => {
        const image = editorialImage(item.slug, mediaUrl(item.image), item.legacyImage)
        const date = isoDate(item.publishedAt)
        return <Link className="blog-article-card" key={item.id} href={'/' + item.slug}>
          {image.src && <div className="blog-article-card-image"><Image src={image.src}
            alt={imageAlt(item.image, image.artwork?.alt || item.title)} width={600} height={400}
            sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1100px) 45vw, 390px" /></div>}
          <div className="blog-article-card-copy">
            {date && <time dateTime={date}>{dateLabel(date)}</time>}
            <h3>{item.title}</h3><p>{item.intro}</p>
            <span className="blog-article-card-action">Прочети статията <span aria-hidden="true">↗</span></span>
          </div>
        </Link>
      })}</div>
    </aside>}
  </div>
}
