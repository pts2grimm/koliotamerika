import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter,SetStepNav } from '@payloadcms/ui'
import { notFound,redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { SocialPanel } from './SocialPanel'
export async function SocialView(props:AdminViewServerProps){
 const {req,permissions,visibleEntities}=props.initPageResult
 if(!req.user)redirect(req.payload.config.routes.admin+'/login')
 if(req.user.collection!=='users'||!permissions.canAccessAdmin)notFound()
 return <DefaultTemplate {...props} req={req} permissions={permissions} visibleEntities={visibleEntities}>
  <Gutter className="koa-overview koa-social"><SetStepNav nav={[{label:'Facebook публикации'}]}/>
   <header className="koa-overview__header"><div><p className="koa-overview__eyebrow">Съдържание · Социални мрежи</p><h1>Facebook публикации</h1><p>Подготви, прегледай и одобри. Публикува се само одобреното съдържание.</p></div></header>
   <SocialPanel/>
  </Gutter>
 </DefaultTemplate>
}
