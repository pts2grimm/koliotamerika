'use client'
import { useEffect, useRef } from 'react'
import { consentFromCookies } from '@/lib/tracking-consent'
import { catalogReceiptKey, type CatalogActivity as Activity } from '@/lib/catalog-activity'

// Mounted results, not server fetches: cached pages count; prefetches and metadata
// requests do not. Anonymous entries describe a browser session, not a person.
export function CatalogActivity({ data, enabled }: { data: Activity; enabled: boolean }) {
  const serialized = JSON.stringify(data)
  const sent = useRef('')
  useEffect(() => {
    if (!enabled) return
    const send = () => {
      if (document.visibilityState !== 'visible' || sent.current === serialized || !consentFromCookies(document.cookie)?.analytics) return
      try {
        let receipt = crypto.randomUUID()
        try {
          const saved = sessionStorage.getItem(catalogReceiptKey)
          if (saved && /^[a-f0-9-]{36}$/i.test(saved)) receipt = saved as typeof receipt
          sessionStorage.setItem(catalogReceiptKey, receipt)
        } catch { /* With blocked storage, each event receives a fresh receipt. */ }
        sent.current = serialized
        void fetch('/api/catalog-activity', {
          method: 'POST', credentials: 'same-origin', keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: crypto.randomUUID(), receipt, data: JSON.parse(serialized) }),
        }).catch(() => {})
      } catch { /* Logging never blocks the catalogue. */ }
    }
    send()
    document.addEventListener('visibilitychange', send)
    window.addEventListener('koa:consent-updated', send)
    return () => { document.removeEventListener('visibilitychange', send); window.removeEventListener('koa:consent-updated', send) }
  }, [serialized, enabled])
  return null
}
