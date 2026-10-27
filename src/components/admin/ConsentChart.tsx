'use client'
import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react'
import './ConsentChart.css'

type Day = { date: string; total: number; accepted: number }
const number = new Intl.NumberFormat('bg-BG')
const date = (value: string) => new Intl.DateTimeFormat('bg-BG', {
  dateStyle: 'medium', timeZone: 'Europe/Sofia',
}).format(new Date(value + 'T12:00:00Z'))

export function ConsentChart({ daily, from, to }: { daily: Day[]; from: string; to: string }) {
  const [selected, setSelected] = useState<number | null>(null)
  const hintId = useId()
  if (!daily.length) return null
  const index = selected === null ? null : Math.min(selected, daily.length - 1)
  const active = index === null ? null : daily[index]
  const max = Math.max(1, ...daily.map(day => Math.max(day.total, day.accepted)))
  const x = (i: number) => daily.length === 1 ? 400 : 30 + i * 740 / (daily.length - 1)
  const y = (value: number) => 180 - value / max * 150
  const points = (key: 'total' | 'accepted') => daily.map((day, i) => x(i) + ',' + y(day[key])).join(' ')
  const describe = (day: Day) => date(day.date) + ': Всички действия: ' + number.format(day.total) + '; Приети всички категории: ' + number.format(day.accepted)
  function selectAtPointer(event: PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    if (!bounds.width) return
    const position = (event.clientX - bounds.left) / bounds.width * 800
    setSelected(Math.max(0, Math.min(daily.length - 1, Math.round((position - 30) / 740 * (daily.length - 1)))))
  }
  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    const current = index ?? 0
    let next: number
    switch (event.key) {
      case 'ArrowRight': case 'ArrowUp': next = Math.min(daily.length - 1, current + 1); break
      case 'ArrowLeft': case 'ArrowDown': next = Math.max(0, current - 1); break
      case 'Home': next = 0; break
      case 'End': next = daily.length - 1; break
      case 'Escape': setSelected(null); event.preventDefault(); return
      default: return
    }
    event.preventDefault()
    setSelected(next)
  }
  return <div className="koa-consent-chart" role="slider" tabIndex={0}
    aria-label="Избори за бисквитки по дни" aria-describedby={hintId}
    aria-valuemin={0} aria-valuemax={daily.length - 1} aria-valuenow={index ?? 0}
    aria-valuetext={describe(active ?? daily[0])}
    onFocus={() => setSelected(current => current ?? 0)} onBlur={() => setSelected(null)}
    onKeyDown={navigate} onPointerLeave={event => { if (event.pointerType !== 'touch') setSelected(null) }}>
    <span id={hintId} className="koa-consent-chart__sr">Посочете или докоснете ден за точните стойности. С клавиатура използвайте стрелките, Home и End; Escape скрива подсказката. Таблицата под графиката съдържа всички дни.</span>
    <svg className="koa-overview__chart koa-consent-chart__svg" viewBox="0 0 800 220" aria-hidden="true"
      onPointerMove={selectAtPointer} onPointerDown={selectAtPointer}>
      {[30, 80, 130, 180].map(line => <line key={line} x1="30" x2="770" y1={line} y2={line} stroke="currentColor" opacity=".12" strokeDasharray="4 6" />)}
      <polyline points={points('total')} fill="none" className="koa-overview__line-total" strokeWidth="3" />
      <polyline points={points('accepted')} fill="none" className="koa-overview__line-accepted" strokeWidth="2" strokeDasharray="6 5" />
      {daily.length === 1 && <><circle cx={x(0)} cy={y(daily[0].total)} r="4" fill="var(--koa-accent)" /><circle cx={x(0)} cy={y(daily[0].accepted)} r="3" fill="#b094dc" /></>}
      {active && index !== null && <g>
        <line x1={x(index)} x2={x(index)} y1="20" y2="180" stroke="currentColor" opacity=".4" strokeDasharray="3 4" />
        <circle cx={x(index)} cy={y(active.total)} r="5" fill="var(--koa-accent)" stroke="var(--koa-card)" strokeWidth="2" />
        <circle cx={x(index)} cy={y(active.accepted)} r="4" fill="#b094dc" stroke="var(--koa-card)" strokeWidth="2" />
      </g>}
      <text x="30" y="210">{date(from)}</text><text x="770" y="210" textAnchor="end">{date(to)}</text>
    </svg>
    {active && index !== null && <div className="koa-consent-chart__tooltip" role="tooltip"
      style={{ left: 'clamp(0px, calc(' + x(index) / 8 + '% - 140px), max(0px, calc(100% - 280px)))' }}>
      <strong>{date(active.date)}</strong>
      <span><i className="koa-consent-chart__total" />Всички действия <b>{number.format(active.total)}</b></span>
      <span><i className="koa-consent-chart__accepted" />Приети всички категории <b>{number.format(active.accepted)}</b></span>
    </div>}
  </div>
}
