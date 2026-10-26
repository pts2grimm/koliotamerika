import { EditableHomeView, type HomeViewProps } from './EditableHomeView'
import { HomeLivePreview } from './HomeLivePreview'
import { CarCard } from './CarCard'
import { AuctionCard } from './AuctionCard'
import { publicArticles } from '@/lib/public-content'
import { searchAuctions, auctionProviderName } from '@/lib/auctions'
import { editorialImage } from '@/lib/editorial-images'
import { mediaUrl, imageAlt } from '@/lib/data'
import type { HomeContent } from '@/lib/home-content'
import type { CarCardData } from '@/lib/list-projections'

export async function EditableHome({content,cars,makes,livePreview=false}:{content:HomeContent;cars:CarCardData[];makes:Record<string,string[]>;livePreview?:boolean}){
 const articles=content.news.enabled||livePreview?(await publicArticles(1,undefined,3)).docs:[]
 let auctionCards:HomeViewProps['auctionCards']=null,auctionFailed=false
 if(!cars.length&&(content.catalogue.enabled||livePreview)){
  try{const result=await searchAuctions('page=1&size=12&site=1%2C2&vehicle_type=Automobile');auctionCards=result.items.slice(0,3).map(car=><AuctionCard key={car.id} car={car}/>)}catch{auctionFailed=true}
 }
 const props:HomeViewProps={content,cars:cars.map(car=><CarCard key={car.id} car={car}/>),carsCount:cars.length,auctionCards,auctionFailed,makes,eridan:auctionProviderName()==='eridan',articles:articles.map(item=>{
  const cover=editorialImage(item.slug,mediaUrl(item.image),item.legacyImage)
  return {id:item.id,slug:item.slug,title:item.title,intro:item.intro,cover:cover.src,alt:imageAlt(item.image,cover.artwork?.alt||item.title)}
 })}
 return livePreview?<HomeLivePreview {...props}/>:<EditableHomeView {...props}/>
}
