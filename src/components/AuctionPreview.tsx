import type { HomeContent } from '@/lib/home-content'
import { homeLink } from '@/lib/home-links'
import { SiteLink as Link } from '@/components/SiteLink'
import { ArrowUpRight } from 'lucide-react'
import { searchAuctions } from '@/lib/auctions'
import { AuctionCard } from './AuctionCard'
export async function AuctionPreview({content}:{content?:HomeContent["catalogue"]}={}){try{const data=await searchAuctions('page=1&size=12&site=1%2C2&vehicle_type=Automobile');return <><div className="car-grid">{data.items.slice(0,3).map(car=><AuctionCard key={car.id} car={car}/>)}</div><p className="auction-preview-note">{content?.note??"Текущите залози не включват разходите за внос. Данните се обновяват периодично."}</p></>}catch{return <div className="discovery-card"><div><span className="eyebrow">{content?.fallbackEyebrow??"ТОЧНИЯТ МОДЕЛ. ПО ТВОИТЕ ПРАВИЛА."}</span><h3>{content?.fallbackTitle??"Имаш автомобил наум?"}</h3><p>{content?.fallbackText??"Разгледай търговете от Copart и IAAI или ни изпрати модела, който търсиш."}</p><Link href={homeLink(content?.auctionHref)||"/targove"} className="button button-dark">{content?.fallbackButton??"Разгледай търговете"} <ArrowUpRight size={18}/></Link></div><div className="discovery-art" aria-hidden="true"><span className="outline-word">{content?.artLabel??"DRIVE"}</span><ArrowUpRight/></div></div>}}
