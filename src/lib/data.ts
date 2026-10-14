import { publicContentCache } from './public-content-cache'
import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Media } from '@/payload-types'
export const cms = cache(() => getPayload({ config }))
export const settings = cache(async () => {
 const payload = await cms()
 return publicContentCache.get('site-settings', () => payload.findGlobal({ slug: 'site-settings', depth: 1, overrideAccess: false, user: null }))
})
export function mediaUrl(image: number | Media | null | undefined) { if (!image || typeof image !== 'object' || !image.url) return undefined; const url = new URL(image.url, siteURL()); return url.origin === new URL(siteURL()).origin ? url.pathname + url.search : url.href }
export function imageAlt(image: number | Media | null | undefined, fallback: string) { return image && typeof image === 'object' ? image.alt : fallback }
export const money = (amount: number) => new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount)
export const siteURL = () => (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')
