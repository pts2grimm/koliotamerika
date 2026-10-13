'use client'
import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

// Keep the existing fresh-document catalogue navigation and reset the UI when
// Back restores a document from the browser's back/forward cache.
export function useDocumentNavigation() {
 const [pending, setPending] = useState(false)
 const started = useRef(false)
 useEffect(() => {
  const reset = () => { started.current = false; setPending(false) }
  window.addEventListener('pageshow', reset)
  return () => window.removeEventListener('pageshow', reset)
 }, [])
 const navigate = (url: string) => {
  if (started.current) return
  started.current = true
  // Commit feedback before starting a document navigation, which can suspend
  // the old page's JavaScript before React's batched update is painted.
  flushSync(() => setPending(true))
  try { window.location.assign(url) } catch (error) {
   started.current = false; setPending(false); throw error
  }
 }
 return { pending, navigate }
}
