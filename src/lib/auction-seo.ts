import type { AuctionCar } from './auction-providers/types'
import { archivedAuctionLabel, isAuctionClosed } from './auction-lifecycle'

const compact = (text: string, max: number) => text.replace(/\s+/g,' ').trim().length <= max
 ? text.replace(/\s+/g,' ').trim()
 : text.replace(/\s+/g,' ').trim().slice(0,max-1).trimEnd()+'…'
export const lotPath = (car: Pick<AuctionCar,'lot_id'|'site'>) => '/targove/kola?lot='+car.lot_id+'&site='+car.site
export function auctionSEO(car: AuctionCar) {
 const auction=car.site===1?'Copart':'IAAI',closed=isAuctionClosed(car)
 const suffix=' — '+auction+' · '+car.lot_id
 const title=compact((closed?'Архив: ':'')+car.title,70-suffix.length)+suffix
 const description=compact(car.title+'. '+(car.vin?'VIN: '+car.vin+'. ':'')+
  (closed?archivedAuctionLabel(car)+'. Архивна обява с наличните снимки и данни от аукциона.':'Лот '+car.lot_id+' от '+auction+'. Разгледай снимките, щетите и данните за внос до България.'),180)
 return {title,description}
}
export function archivedVehicleData(car: AuctionCar, base: string, images: string[]) {
 const url=new URL(lotPath(car),base).href
 const powersports=car.vehicle_type==='Motorcycle'||car.vehicle_type==='ATVUTV'
 const catalogue=powersports?'/targove/motori-atv':'/targove'
 const {description}=auctionSEO(car)
 return {'@context':'https://schema.org','@graph':[
  {'@type':'WebPage','@id':url+'#page',url,name:car.title,description,inLanguage:'bg-BG',about:{'@id':url+'#vehicle'}},
  {'@type':'Vehicle','@id':url+'#vehicle',url,name:car.title,description,
   ...(car.make?{brand:{'@type':'Brand',name:car.make}}:{}),...(car.model?{model:car.model}:{}),
   ...(car.year?{vehicleModelDate:String(car.year)}:{}),
   ...(car.vin&&/^[A-HJ-NPR-Z0-9]{17}$/i.test(car.vin)?{vehicleIdentificationNumber:car.vin}:{}),
   ...(car.odometer!=null&&(car.odometer_unit==='mi'||car.odometer_unit==='km')?{mileageFromOdometer:{'@type':'QuantitativeValue',value:car.odometer,unitCode:car.odometer_unit==='km'?'KMT':'SMI'}}:{}),
   ...(images.length?{image:images}:{}),...(car.fuel?{fuelType:car.fuel}:{}),
   ...(car.transmission?{vehicleTransmission:car.transmission}:{})},
  {'@type':'BreadcrumbList',itemListElement:[
   ['Начало','/'],[powersports?'Мотори и ATV':'Търгове',catalogue],['Архив',catalogue+'/arhiv'],[car.title,lotPath(car)]
  ].map(([name,path],index)=>({'@type':'ListItem',position:index+1,name,item:new URL(path,base).href}))}
 ]}
}
