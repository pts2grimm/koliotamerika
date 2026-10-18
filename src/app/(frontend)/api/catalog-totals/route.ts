import { cms, siteURL } from '@/lib/data'
import { isPreview } from '@/lib/preview'
import { validateCatalogTotal } from '@/lib/catalog-totals'
import { incrementCatalogTotal } from '@/lib/catalog-totals-server'
export const runtime = 'nodejs'
const reply=(status:number)=>new Response(null,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex'}})
export async function POST(request: Request) {
  if(isPreview() || request.headers.get('origin')!==new URL(siteURL()).origin || request.headers.get('sec-fetch-site')==='cross-site') return reply(403)
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return reply(415)
  // Intentionally never read cookies, authentication, IP, User-Agent or Referer.
  const reader=request.body?.getReader()
  if(!reader) return reply(400)
  let size=0
  const chunks:Uint8Array[]=[]
  try {
    while(true) {
      const {done,value}=await reader.read()
      if(done)break
      size+=value.length
      if(size>1024){await reader.cancel();return reply(413)}
      chunks.push(value)
    }
    const data=validateCatalogTotal(JSON.parse(Buffer.concat(chunks).toString('utf8')))
    if(!data)return reply(400)
    return reply(await incrementCatalogTotal(await cms(),data)?204:429)
  } catch(error) {
    if(error instanceof SyntaxError)return reply(400)
    // Do not log request data or headers on failure.
    console.warn('Catalogue counter unavailable.')
    return reply(503)
  }
}
