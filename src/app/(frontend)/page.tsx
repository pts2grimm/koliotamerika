import type { Metadata } from 'next'
import { carCardSelect } from '@/lib/list-projections'
import { cms, mediaUrl } from '@/lib/data'
import { homepage } from '@/lib/homepage'
import { resolveHome } from '@/lib/home-content'
import { EditableHome } from '@/components/EditableHome'
import { auctionMakes } from '@/lib/auctions'
import './home-clarity.css'
import './home-editor.css'
export async function generateMetadata():Promise<Metadata>{
 const home=resolveHome(await homepage())
 const image=mediaUrl(home.seo.image)||'/images/hero.png'
 return {
  title:{absolute:home.seo.title},description:home.seo.description,alternates:{canonical:'/'},
  openGraph:{type:'website',locale:'bg_BG',url:'/',title:home.seo.title,description:home.seo.description,images:[{url:image,alt:home.seo.imageAlt}]},
  twitter:{card:'summary_large_image',title:home.seo.title,description:home.seo.description,images:[image]},
 }
}
export default async function Home(){
 const content=resolveHome(await homepage())
 const [cars,makes]=await Promise.all([
  content.catalogue.enabled?(await cms()).find({collection:'cars',overrideAccess:false,select:carCardSelect,depth:1,limit:3,sort:'-createdAt'}):Promise.resolve({docs:[]}),
  content.search.enabled?auctionMakes().catch(()=>({})):Promise.resolve({}),
 ])
 return <EditableHome content={content} cars={cars.docs} makes={makes}/>
}
