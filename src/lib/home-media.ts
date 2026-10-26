import type { Media } from '@/payload-types'
// Pure presentation helper shared by the server page and the live preview.
export function homeMediaURL(image:number|Media|null|undefined){
 if(!image||typeof image!=='object'||!image.url)return undefined
 const origin=process.env.NEXT_PUBLIC_SERVER_URL||'http://localhost:3000'
 const url=new URL(image.url,origin)
 return url.origin===new URL(origin).origin?url.pathname+url.search:url.href
}
