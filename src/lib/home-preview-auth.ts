import { cache } from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { cms } from './data'
// React cache deduplicates only within this request; never cache authentication across visitors.
export const requireHomePreviewAdmin=cache(async()=>{
 const payload=await cms()
 const {user}=await payload.auth({headers:await headers()})
 if(user?.collection!=='users')notFound()
 return payload
})
