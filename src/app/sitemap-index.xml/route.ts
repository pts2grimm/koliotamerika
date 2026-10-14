import { siteURL } from '@/lib/data'
import { auctionProviderName } from '@/lib/auctions'
import { requestIsIndexable } from '@/lib/indexing-policy'
import { auctionSitemapSections, sitemapXML } from '@/lib/auction-sitemap'
export const dynamic='force-dynamic'
export function GET(request:Request) {
 const base=siteURL(),allowed=requestIsIndexable(request.headers.get('host'))
 const urls=allowed?[base+'/sitemap.xml',...(auctionProviderName()==='eridan'?auctionSitemapSections.map(section=>base+'/sitemaps/auctions/'+section):[])]:[]
 return new Response(sitemapXML(urls,true),{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'}})
}
