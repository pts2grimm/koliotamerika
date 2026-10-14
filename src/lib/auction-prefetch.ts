export function auctionPrefetchKey(href: unknown): string | undefined {
 if(typeof href!=='string'||!href.startsWith('/targove/kola?'))return
 try {
  const url=new URL(href,'https://local.invalid')
  if(url.pathname!=='/targove/kola'||url.hash||[...url.searchParams.keys()].some(key=>key!=='lot'&&key!=='site'))return
  const lot=url.searchParams.getAll('lot'),site=url.searchParams.getAll('site')
  if(lot.length!==1||site.length!==1||!/^\d{5,12}$/.test(lot[0])||!['1','2'].includes(site[0]))return
  return '/targove/kola?lot='+lot[0]+'&site='+site[0]
 }catch{return}
}

export function createAuctionPrefetchBudget(now=Date.now) {
 const seen=new Map<string,number>()
 let starts:number[]=[]
 return {
  claim(href:unknown){
   const key=auctionPrefetchKey(href),time=now()
   starts=starts.filter(start=>time-start<60_000)
   if(!key||seen.has(key)||starts.length>=2)return false
   starts.push(time);seen.set(key,time)
   while(seen.size>256)seen.delete(seen.keys().next().value!)
   return true
  },
  expired(href:unknown){
   const key=auctionPrefetchKey(href),started=key?seen.get(key):undefined
   return started!==undefined&&now()-started>=15_000
  },
 }
}
