import { siteURL } from '@/lib/data'
import { auctionProviderName, auctionImages, searchAuctions } from '@/lib/auctions'
import { requestIsIndexable } from '@/lib/indexing-policy'
import { isAuctionSitemapSection, sitemapLotURLs, sitemapSearch, sitemapXML } from '@/lib/auction-sitemap'
export const dynamic='force-dynamic'
export async function GET(request:Request,{params}:{params:Promise<{section:string}>}) {
 const {section}=await params
 const headers={'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'}
 if(!isAuctionSitemapSection(section)||auctionProviderName()!=='eridan')return new Response('Not found',{status:404})
 // Check BEFORE any provider calls, even when the environment was misconfigured.
 if(!requestIsIndexable(request.headers.get('host')))return new Response(sitemapXML([]),{headers})
 try{
  const result=await searchAuctions(sitemapSearch(section))
  const cars=result.items.filter(car=>auctionImages({...car,link_img_small:[]}).length>0)
  return new Response(sitemapXML(sitemapLotURLs(cars,siteURL(),section)),{headers})
 }catch{
  // Do not tell crawlers that an API failure is an empty, successful sitemap.
  return new Response('Auction sitemap temporarily unavailable',{status:503,headers:{'Cache-Control':'no-store','Retry-After':'60','Content-Type':'text/plain; charset=utf-8'}})
 }
}
