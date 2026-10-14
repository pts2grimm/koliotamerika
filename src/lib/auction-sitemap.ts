import type { AuctionCar } from './auction-providers/types'
import { isAuctionClosed } from './auction-lifecycle'
import { lotPath } from './auction-seo'

export const auctionSitemapSections=['cars','cars-archive','powersports','powersports-archive'] as const
export type AuctionSitemapSection=typeof auctionSitemapSections[number]
export const isAuctionSitemapSection=(value:string):value is AuctionSitemapSection => (auctionSitemapSections as readonly string[]).includes(value)
export function sitemapSearch(section:AuctionSitemapSection) {
 return new URLSearchParams({site:'1,2',size:'24',page:'1',vehicle_type:section.startsWith('powersports')?'Powersports':'Automobile',sort:section.endsWith('archive')?'auction_late':'auction_soon',...(section.endsWith('archive')?{archive:'ended'}:{})}).toString()
}
export const xmlEscape=(value:string)=>value.replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]!))
export const sitemapXML=(urls:string[],index=false)=>'<?xml version="1.0" encoding="UTF-8"?>'+
 '<'+(index?'sitemapindex':'urlset')+' xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+
 urls.map(url=>'<'+(index?'sitemap':'url')+'><loc>'+xmlEscape(url)+'</loc></'+(index?'sitemap':'url')+'>').join('')+
 '</'+(index?'sitemapindex':'urlset')+'>'
export function sitemapLotURLs(cars:AuctionCar[],base:string,section:AuctionSitemapSection,now=Date.now()) {
 return [...new Set(cars.filter(car=>Number.isSafeInteger(car.lot_id)&&/^\d{5,12}$/.test(String(car.lot_id))&&[1,2].includes(car.site)&&Boolean(car.link_img_hd?.length)
  &&(section.startsWith('powersports')?['Motorcycle','ATVUTV'].includes(car.vehicle_type||''):car.vehicle_type==='Automobile')
  &&(section.endsWith('archive')?isAuctionClosed(car,now):car.auction_status==='active'&&!isAuctionClosed(car,now)))
  .slice(0,48).map(car=>new URL(lotPath(car),base).href))]
}
