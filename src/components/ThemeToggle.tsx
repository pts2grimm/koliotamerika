'use client'
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { THEME_STORAGE_KEY } from '@/lib/theme'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => {
      let saved: string | null = null
      try { saved = localStorage.getItem(THEME_STORAGE_KEY) } catch {}
      const next = saved === 'dark' || (saved !== 'light' && media.matches)
      document.documentElement.dataset.theme = next ? 'dark' : 'light'
      setDark(next)
    }
    const storage = (event: StorageEvent) => { if (!event.key || event.key === THEME_STORAGE_KEY) sync() }
    sync()
    media.addEventListener('change', sync)
    window.addEventListener('storage', storage)
    return () => { media.removeEventListener('change', sync); window.removeEventListener('storage', storage) }
  }, [])
  const toggle = () => {
    const next = document.documentElement.dataset.theme !== 'dark'
    document.documentElement.dataset.theme = next ? 'dark' : 'light'
    setDark(next)
    try { localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light') } catch {}
  }
  return <button type="button" className="theme-toggle" aria-label="Тъмна тема" aria-pressed={dark} title={dark ? 'Включи светла тема' : 'Включи тъмна тема'} onClick={toggle}><Moon className="theme-moon" size={20} aria-hidden="true" /><Sun className="theme-sun" size={20} aria-hidden="true" /></button>
}
