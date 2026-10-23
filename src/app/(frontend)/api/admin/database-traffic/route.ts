import { cms } from '@/lib/data'
import { databaseTraffic } from '@/lib/database-traffic'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function GET(request:Request) {
 const headers={'Cache-Control':'private, no-store','Vary':'Cookie, Authorization','X-Content-Type-Options':'nosniff'}
 const payload=await cms()
 const {user}=await payload.auth({headers:request.headers})
 if(user?.collection!=='users')return Response.json({error:'Необходим е администраторски вход.'},{status:403,headers})
 return Response.json(databaseTraffic.snapshot(),{headers})
}
