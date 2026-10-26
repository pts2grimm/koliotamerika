import { requireHomePreviewAdmin } from '@/lib/home-preview-auth'
import { resolveHome } from '@/lib/home-content'
import { carCardSelect } from '@/lib/list-projections'
import { auctionMakes } from '@/lib/auctions'
import { EditableHome } from '@/components/EditableHome'
export default async function HomePreview(){
 const payload=await requireHomePreviewAdmin()
 const [content,cars,makes]=await Promise.all([
  payload.findGlobal({slug:'homepage',depth:1,overrideAccess:false}),
  payload.find({collection:'cars',overrideAccess:false,select:carCardSelect,depth:1,limit:3,sort:'-createdAt'}),
  auctionMakes().catch(()=>({})),
 ])
 return <EditableHome content={resolveHome(content)} cars={cars.docs} makes={makes} livePreview/>
}
