import { Resolver } from 'node:dns/promises'
import { isIP } from 'node:net'
import { canonicalIP } from './catalog-guard'

export type Crawler = '' | 'Google' | 'Bing'
type DNS = { reverse(ip:string):Promise<string[]>; forward(host:string, family:number):Promise<string[]>; cancel():void }
export function crawlerClaim(agent: string): Crawler {
  if (/\b(?:Googlebot|Google-InspectionTool)\b/i.test(agent)) return 'Google'
  if (/\bbingbot\b/i.test(agent)) return 'Bing'
  return ''
}
function validHost(host: string, claim: Crawler) {
  if (claim === 'Google') return /^(?:crawl-[a-z0-9-]+\.googlebot\.com|geo-crawl-[a-z0-9-]+\.geo\.googlebot\.com|google-proxy-[a-z0-9-]+\.google\.com)$/.test(host)
  return claim === 'Bing' && /^[a-z0-9-]+\.search\.msn\.com$/.test(host)
}
function dnsResolver(): DNS {
  const resolver = new Resolver({ timeout: 700, tries: 1 })
  return { reverse: ip => resolver.reverse(ip), forward: (host,family) => family===6 ? resolver.resolve6(host) : resolver.resolve4(host), cancel: () => resolver.cancel() }
}
// Forward-confirm reverse DNS. User-Agent alone never exempts a caller.
// Bound cached identities, pending lookups, and duration of DNS work.
export function createCrawlerVerifier(factory:()=>DNS = dnsResolver, clock=Date.now) {
  const cache = new Map<string,{ value:Crawler; until:number }>()
  const pending = new Map<string,Promise<Crawler>>()
  return async function verify(ip:string, agent:string):Promise<Crawler> {
    const claim = crawlerClaim(agent), address=canonicalIP(ip)
    if (!claim || !address) return ''
    const key=claim+':'+address, cached=cache.get(key)
    if (cached && cached.until>clock()) return cached.value
    const running=pending.get(key)
    if (running) return running
    if (pending.size>=8) return ''
    const task=(async():Promise<Crawler>=>{
      const dns=factory()
      let timer:ReturnType<typeof setTimeout> | undefined
      let value:Crawler=''
      try {
        value=await Promise.race([
          (async():Promise<Crawler>=>{
            const hosts=(await dns.reverse(address)).slice(0,4)
            for(const raw of hosts) {
              const host=raw.toLowerCase().replace(/\.$/,'')
              if(host.length>253 || !validHost(host,claim)) continue
              const addresses=await dns.forward(host,isIP(address))
              if(addresses.some(a=>canonicalIP(a)===address)) return claim
            }
            return ''
          })(),
          new Promise<Crawler>(resolve=>{timer=setTimeout(()=>{dns.cancel();resolve('')},1800)}),
        ])
      } catch { value='' } finally { if(timer)clearTimeout(timer);dns.cancel() }
      if(cache.size>=2000) cache.delete(cache.keys().next().value!)
      cache.set(key,{value,until:clock()+(value?3600000:300000)})
      return value
    })()
    pending.set(key,task)
    try { return await task } finally { pending.delete(key) }
  }
}
export const verifyCrawler = createCrawlerVerifier()
