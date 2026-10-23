import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter, SetStepNav } from '@payloadcms/ui'
import { notFound, redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { databaseTraffic } from '@/lib/database-traffic'
import { AdminAnalyticsTabs } from './AdminAnalyticsTabs'
import { DatabaseTrafficReport } from './DatabaseTrafficReport'
export async function DatabaseTrafficView(props:AdminViewServerProps) {
 const {req,permissions,visibleEntities}=props.initPageResult
 const root=req.payload.config.routes.admin
 if(!req.user)redirect(root+'/login')
 if(req.user.collection!=='users'||!permissions.canAccessAdmin)notFound()
 return <DefaultTemplate {...props} req={req} permissions={permissions} visibleEntities={visibleEntities}>
  <Gutter className="koa-overview koa-database-page">
   <SetStepNav nav={[{label:'Трафик на базата'}]}/>
   <header className="koa-overview__header"><div><p className="koa-overview__eyebrow">Настройки · Диагностика</p><h1>Трафик на базата</h1><p>Кои заявки връщат най-много данни от Supabase към сайта.</p></div></header>
   <AdminAnalyticsTabs active="database" root={root}/>
   <DatabaseTrafficReport initial={databaseTraffic.snapshot()}/>
  </Gutter>
 </DefaultTemplate>
}
