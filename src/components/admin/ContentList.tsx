import { adminContentSelect } from '@/lib/list-projections'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter, Link, SetStepNav } from '@payloadcms/ui'
import { notFound, redirect } from 'next/navigation'
import type { AdminViewServerProps, ListViewServerProps, Where } from 'payload'

type Kind = 'page' | 'article'
const scalar = (value: unknown) => typeof value === 'string' ? value : ''

async function ContentList(props: AdminViewServerProps, kind: Kind) {
  const { req, permissions, visibleEntities } = props.initPageResult
  const root = req.payload.config.routes.admin
  // Custom root views do not automatically inherit Payload's admin access gate.
  if (!req.user) redirect(`${root}/login`)
  if (req.user.collection !== 'users' || !permissions.canAccessAdmin || !permissions.collections?.pages?.read) notFound()

  const article = kind === 'article'
  const title = article ? 'Блог' : 'Страници'
  const route = `${root}/${article ? 'blog-posts' : 'site-pages'}`
  const search = scalar(props.searchParams?.search).trim().slice(0, 200)
  const requestedStatus = scalar(props.searchParams?.status)
  const status = ['draft', 'published', ...(article ? ['scheduled'] : [])].includes(requestedStatus) ? requestedStatus : ''
  const rawPage = scalar(props.searchParams?.page)
  const page = /^[1-9]\d{0,5}$/.test(rawPage) ? Number(rawPage) : 1
  const now = new Date().toISOString()
  const conditions: Where[] = [article
    ? { kind: { equals: 'article' } }
    : { or: [{ kind: { equals: 'page' } }, { kind: { exists: false } }] }]
  if (search) conditions.push({ or: [{ title: { contains: search } }, { slug: { contains: search } }] })
  if (status) conditions.push({ status: { equals: status === 'scheduled' ? 'published' : status } })
  if (status === 'scheduled') conditions.push({ publishedAt: { greater_than: now } })
  if (article && status === 'published') conditions.push({ or: [
    { publishedAt: { exists: false } }, { publishedAt: { less_than_equal: now } },
  ] })
  const data = await req.payload.find({
    collection: 'pages', select: adminContentSelect, req, overrideAccess: false, depth: 0,
    where: { and: conditions }, sort: '-updatedAt', limit: 20, page,
  })
  const pageURL = (number: number) => {
    const query = new URLSearchParams({ page: String(number) })
    if (search) query.set('search', search)
    if (status) query.set('status', status)
    return `${route}?${query}`
  }
  if (page > Math.max(data.totalPages, 1)) redirect(pageURL(Math.max(data.totalPages, 1)))
  const date = (value: string) => new Intl.DateTimeFormat('bg-BG', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Sofia',
  }).format(new Date(value))

  return <DefaultTemplate {...props} req={req} permissions={permissions}
    visibleEntities={{ collections: visibleEntities.collections, globals: visibleEntities.globals }}>
    <Gutter className="content-list">
      <SetStepNav nav={[{ label: title }]} />
      <header className="content-list__header">
        <div><h1>{title}</h1><p>{article ? 'Статии, новини и ръководства за блога.' : 'Основни страници, услуги и лендинг страници.'}</p></div>
        {permissions.collections?.pages?.create && <Link className="content-list__button" href={`${root}/collections/pages/create?kind=${kind}`}>
          {article ? 'Нова статия' : 'Нова страница'}
        </Link>}
      </header>
      <form method="get" action={route} className="content-list__filters">
        <label>Търсене<input name="search" type="search" defaultValue={search} placeholder="Заглавие или URL адрес" /></label>
        <label>Статус<select name="status" defaultValue={status}>
          <option value="">Всички</option><option value="draft">Чернови</option>
          <option value="published">Публикувани</option>
          {article && <option value="scheduled">Насрочени</option>}
        </select></label>
        <button className="content-list__button" type="submit">Покажи</button>
        {(search || status) && <Link href={route}>Изчисти</Link>}
      </form>
      <p className="content-list__count">{data.totalDocs} {article ? 'статии' : 'страници'} · Дати: българско време</p>
      {data.docs.length ? <div className="content-list__table-wrap"><table className="content-list__table">
        <thead><tr><th>Заглавие</th><th>Статус</th>{article && <th>Публикуване</th>}<th>Редактирано</th></tr></thead>
        <tbody>{data.docs.map(doc => {
          const scheduled = article && doc.status === 'published' && doc.publishedAt && doc.publishedAt > now
          return <tr key={doc.id}>
            <td><Link href={`${root}/collections/pages/${doc.id}`}>{doc.title}</Link><small>/{doc.slug}</small></td>
            <td><span className="content-list__status">{doc.status !== 'published' ? 'Чернова' : scheduled ? 'Насрочена' : 'Публикувана'}</span></td>
            {article && <td>{doc.publishedAt ? date(doc.publishedAt) : '—'}</td>}
            <td>{date(doc.updatedAt)}</td>
          </tr>
        })}</tbody>
      </table></div> : <p className="content-list__empty">Няма намерени {article ? 'статии' : 'страници'}.</p>}
      {data.totalPages > 1 && <nav aria-label="Страници с резултати" className="content-list__pagination">
        {data.hasPrevPage && <Link href={pageURL(page - 1)}>← Предишна</Link>}
        <span>Страница {page} от {data.totalPages}</span>
        {data.hasNextPage && <Link href={pageURL(page + 1)}>Следваща →</Link>}
      </nav>}
    </Gutter>
  </DefaultTemplate>
}

export const SitePagesView = (props: AdminViewServerProps) => ContentList(props, 'page')
export const BlogPostsView = (props: AdminViewServerProps) => ContentList(props, 'article')

// Old bookmarks and the collection breadcrumb still lead to a useful list.
export function ContentIndex(props: ListViewServerProps) {
  redirect(`${props.payload.config.routes.admin}/site-pages`)
}
