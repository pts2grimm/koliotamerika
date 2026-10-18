import { isIP } from 'node:net'
export type CatalogueRequestIP = { address: string; source: 'x-real-ip' | 'x-forwarded-for' }
export function validRequestIP(value: unknown): string {
  if (typeof value !== 'string' || value.length > 64) return ''
  const ip=value.trim()
  return !ip.includes('%') && isIP(ip) ? ip.toLowerCase() : ''
}
// Only enable behind a controlled proxy. Hostinger overwrites X-Real-IP and
// appends its connecting address LAST to X-Forwarded-For. Never trust the first entry.
export function catalogueRequestIP(headers: Pick<Headers,'get'>, trustProxy: boolean): CatalogueRequestIP | undefined {
  if (!trustProxy) return undefined
  const real=validRequestIP(headers.get('x-real-ip'))
  if (real) return {address:real,source:'x-real-ip'}
  const forwarded=headers.get('x-forwarded-for')
  if (!forwarded || forwarded.length > 2048) return undefined
  const last=validRequestIP(forwarded.split(',').at(-1))
  return last ? {address:last,source:'x-forwarded-for'} : undefined
}
