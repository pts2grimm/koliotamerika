import { cache } from 'react'
import { cms } from './data'
import { publicContentCache } from './public-content-cache'
export const homepage=cache(async()=>publicContentCache.get('homepage',async()=>{
 const payload=await cms()
 return payload.findGlobal({slug:'homepage',depth:1,overrideAccess:false,user:null})
}))
