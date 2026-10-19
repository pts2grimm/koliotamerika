'use client'

import { useState } from 'react'

type GuardRow = {
  ip: string
  agent: string
  scope: string
  verified: string
  last_seen: string
  date: string
  total: number
  blocked: number
  last_reason: string
}

const pageSize = 10

export function CatalogGuardTable({ rows }: { rows: GuardRow[] }) {
  const [requestedPage, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const page = Math.min(requestedPage, pages)
  const offset = (page - 1) * pageSize
  return <>
    <div className="koa-catalog-report__table koa-catalog-guard__scroll" tabIndex={0} role="region" aria-label="Почасови заявки към каталога">
      <table><thead><tr><th>Последна заявка</th><th>IP / мрежа</th><th>Заявки за часа</th><th>Над квотата</th><th>Последна проверка</th><th>User-Agent</th></tr></thead><tbody>
        {rows.slice(offset, offset + pageSize).map(row => <tr key={row.ip + ':' + row.last_seen}>
          <td>{row.date}</td>
          <td>{row.ip}<small>{row.ip.includes(':') ? 'Обща IPv6 /64 квота' : 'IPv4'}</small></td>
          <td>{row.total}<small>{row.scope === 'vehicle' ? 'Автомобил' : row.scope === 'models' ? 'Модели' : 'Каталог'}</small></td>
          <td>{row.blocked}<small>{row.last_reason === 'hour' ? 'Последно: часов лимит' : row.last_reason === 'minute' ? 'Последно: минутен лимит' : ''}</small></td>
          <td>{row.verified ? row.verified + ' · потвърден DNS' : 'Няма потвърдена търсачка'}</td>
          <td className="koa-catalog-guard__agent">{row.agent.length > 48
            ? <details><summary title="Разгъни целия User-Agent">{row.agent.slice(0, 48)}…</summary><p>{row.agent}</p></details>
            : row.agent || 'Не е подаден'}</td>
        </tr>)}
        {!rows.length && <tr><td colSpan={6}>Още няма HTTP заявки, отчетени от защитата.</td></tr>}
      </tbody></table>
    </div>
    <nav className="koa-catalog-guard__pages" aria-label="Страници на защитата на каталога">
      <span aria-live="polite">{rows.length ? offset + 1 : 0}–{Math.min(offset + pageSize, rows.length)} от {rows.length} групи · Страница {page} / {pages}</span>
      <div>
        <button type="button" className="koa-overview__button koa-overview__button--quiet" disabled={page === 1} onClick={() => setPage(page - 1)}>← Предишна</button>
        <button type="button" className="koa-overview__button koa-overview__button--quiet" disabled={page === pages} onClick={() => setPage(page + 1)}>Следваща →</button>
      </div>
    </nav>
  </>
}
