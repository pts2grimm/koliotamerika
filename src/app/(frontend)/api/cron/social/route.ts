import { createHash,timingSafeEqual } from 'node:crypto'
import { cms } from '@/lib/data'
import { runSocial } from '@/lib/social/runner'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=120
export async function POST(request:Request){
 const secret=process.env.SOCIAL_CRON_SECRET
 const expected=secret&&secret.length>=32?'Bearer '+secret:''
 const supplied=request.headers.get('authorization')||''
 const digest=(value:string)=>createHash('sha256').update(value).digest()
 if(!expected||!timingSafeEqual(digest(expected),digest(supplied)))return Response.json({error:'Unauthorized'},{status:403,headers:{'Cache-Control':'no-store'}})
 try{return Response.json(await runSocial(await cms()),{headers:{'Cache-Control':'no-store'}})}
 catch{return Response.json({error:'Social runner failed; review the admin history before retrying any publication.'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
