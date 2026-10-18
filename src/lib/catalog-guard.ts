import { isIP } from 'node:net'
import { validRequestIP } from './catalog-request-ip'

export function guardScope(path: string): string | undefined {
  try { path = decodeURIComponent(path) } catch { return 'invalid-path' }
  path = (path.replace(/\/+$/, '') || '/').toLowerCase()
  if (path === '/api/auction-models') return 'models'
  if (path === '/targove/kola') return 'vehicle'
  if (path === '/targove' || path.startsWith('/targove/')) return 'catalogue'
}
export function canonicalIP(input: string): string {
  const ip = validRequestIP(input)
  if (!ip) return ''
  if (isIP(ip) === 4) return ip
  const canonical = new URL('http://[' + ip + ']').hostname.slice(1, -1)
  const mapped = canonical.match(/^::ffff:([a-f0-9]+):([a-f0-9]+)$/)
  if (mapped) {
    const n = parseInt(mapped[1],16) * 65536 + parseInt(mapped[2],16)
    return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')
  }
  return canonical
}
// Privacy addresses in the same IPv6 /64 share a quota, not a presumed identity.
export function guardIdentity(ip: string): string {
  const canonical = canonicalIP(ip)
  if (isIP(canonical) !== 6) return canonical
  const [left, right = ''] = canonical.split('::')
  const a = left ? left.split(':') : [], b = right ? right.split(':') : []
  const words = canonical.includes('::') ? [...a, ...Array(8-a.length-b.length).fill('0'), ...b] : a
  return words.slice(0,4).map(w => parseInt(w,16).toString(16)).join(':') + '::/64'
}
export function safeAgent(value: string | null): string {
  return (value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0,300)
}
export function guardLimits(env: Partial<NodeJS.ProcessEnv> = process.env) {
  const number = (value: string | undefined, fallback: number, min: number, max: number) =>
    value && /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max ? Number(value) : fallback
  return { minute: number(env.CATALOG_RATE_PER_MINUTE,120,30,1000), hour: number(env.CATALOG_RATE_PER_HOUR,1200,300,20000) }
}
