'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@payloadcms/ui'
import { RefreshCw, Sun, Moon } from 'lucide-react'

export function OverviewActions() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  return <div className="koa-overview__actions">
    <button type="button" className="koa-overview__icon" aria-label="Смени темата" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
    <button type="button" className="koa-overview__icon" aria-label="Обнови отчета" onClick={() => router.refresh()}><RefreshCw size={18} /></button>
    <a className="koa-overview__button koa-overview__button--quiet" href="/" target="_blank" rel="noreferrer">Към сайта ↗</a>
    <a className="koa-overview__button" href="/admin/collections/pages/create?kind=article">+ Нова статия</a>
  </div>
}
export function PeriodControls({ preset, from, to }: { preset: string; from: string; to: string }) {
  const [period, setPeriod] = useState(preset)
  return <form method="get" className="koa-overview__filters">
    <label>Период<select name="period" value={period} onChange={e => setPeriod(e.target.value)}>
      <option value="7">Последни 7 дни</option><option value="30">Последни 30 дни</option>
      <option value="90">Последни 90 дни</option><option value="custom">Избери дати</option>
    </select></label>
    <label>От<input name="from" type="date" defaultValue={from} onChange={() => setPeriod('custom')} /></label>
    <label>До<input name="to" type="date" defaultValue={to} onChange={() => setPeriod('custom')} /></label>
    <button className="koa-overview__button koa-overview__button--quiet" type="submit">Приложи</button>
    <span>Българско време · до 90 дни</span>
  </form>
}
