import { isEridanRoadModel } from './eridan-scope'

// Conservative display families. Unknown models stay selectable under their original name.
// Order longer roots first: Corolla Cross, Mustang Mach-E, Bronco Sport etc remain distinct.
const roots: Record<string, string[]> = {
 CANAM: ['RENEGADE'],
 VOLKSWAGEN: ['ATLAS CROSS SPORT','GOLF','JETTA','PASSAT','TIGUAN','TOUAREG','ATLAS','TAOS','ARTEON','BEETLE','EOS','CC','ROUTAN','EUROVAN','VANAGON','TRANSPORTER','PHAETON','ID.4','ID. BUZZ','CORRADO','SCIROCCO'],
 TOYOTA: ['COROLLA CROSS','GRAND HIGHLANDER','CROWN SIGNIA','LAND CRUISER PRADO','LAND CRUISER','FJ CRUISER','CAMRY SOLARA','COROLLA MATRIX','PRIUS C','PRIUS V','GR COROLLA','GR SUPRA','GR 86','COROLLA','CAMRY','RAV4','HIGHLANDER','4RUNNER','TACOMA','TUNDRA','SIENNA','SEQUOIA','PRIUS','CROWN','AVALON','VENZA','YARIS','MATRIX','MIRAI','SUPRA','CELICA','SOLARA','TERCEL','PREVIA','BZ4X','BZ','C-HR','86','T100','MR2'],
 FORD: ['MUSTANG MACH-E','BRONCO SPORT','EXPLORER SPORT TRAC','TRANSIT CONNECT','F-150 LIGHTNING','F-150','F-250','F-350','F-450','F-550','E-150','E-250','E-350','MUSTANG','BRONCO','EXPLORER','EXPEDITION','ESCAPE','EDGE','FUSION','FOCUS','FIESTA','FLEX','TAURUS','RANGER','MAVERICK','TRANSIT','ECOSPORT','C-MAX','CROWN VICTORIA','THUNDERBIRD','FIVE HUNDRED','FREESTYLE'],
 HONDA: ['ACCORD CROSSTOUR','CIVIC','ACCORD','CR-V','HR-V','CR-Z','CR-X','PILOT','PASSPORT','ODYSSEY','RIDGELINE','FIT','INSIGHT','CLARITY','CROSSTOUR','ELEMENT','PRELUDE','S2000','PROLOGUE','DEL SOL'],
 CHEVROLET: ['SILVERADO 1500','SILVERADO 2500','SILVERADO 3500','COLORADO','TRAILBLAZER','BLAZER EV','BLAZER','EQUINOX EV','EQUINOX','BOLT EUV','BOLT EV','CORVETTE','CAMARO','MALIBU','CRUZE','IMPALA','TAHOE','SUBURBAN','TRAVERSE','TRAX','SONIC','SPARK','VOLT','AVALANCHE','EXPRESS','COBALT','HHR','UPLANDER','MONTE CARLO','S10','SSR','SS'],
 GMC: ['SIERRA 1500','SIERRA 2500','SIERRA 3500','YUKON XL','YUKON','ACADIA','TERRAIN','CANYON','SAVANA','ENVOY','HUMMER EV'],
 NISSAN: ['ROGUE SPORT','ROGUE SELECT','TITAN XD','VERSA NOTE','ROGUE','ALTIMA','SENTRA','MAXIMA','MURANO','PATHFINDER','FRONTIER','TITAN','ARMADA','VERSA','KICKS','LEAF','ARIYA','JUKE','QUEST','XTERRA','CUBE','QASHQAI','GT-R','370Z','350Z','300ZX','240SX','SKYLINE','NV200','NV1500','NV2500','NV3500','Z'],
 HYUNDAI: ['IONIQ 5','IONIQ 6','IONIQ 9','GENESIS COUPE','SANTA FE SPORT','SANTA FE XL','SANTA FE','SANTA CRUZ','ELANTRA GT','ELANTRA TOURING','ELANTRA','SONATA','TUCSON','PALISADE','KONA','VENUE','ACCENT','VELOSTER','IONIQ','AZERA','EQUUS','GENESIS','VERACRUZ','ENTOURAGE','TIBURON','NEXO','XG350'],
 KIA: ['SPORTAGE','SORENTO','SELTOS','TELLURIDE','CARNIVAL','SEDONA','SOUL','NIRO','FORTE5','FORTE','OPTIMA','STINGER','CADENZA','SPECTRA5','SPECTRA','BORREGO','AMANTI','RONDO','RIO','K900','K5','K4','EV9','EV6','EV5','EV4','EV3'],
 PORSCHE: ['718 BOXSTER','718 CAYMAN','718 SPYDER','911','CAYENNE','MACAN','PANAMERA','TAYCAN','BOXSTER','CAYMAN','912','914','918','924','928','944','968'],
 MAZDA: ['CX-90','CX-70','CX-60','CX-50','CX-30','CX-9','CX-8','CX-7','CX-5','CX-3','MX-5','MX-30','MAZDA3','MAZDA6','MAZDA5','MAZDA2','RX-8','RX-7','TRIBUTE','MPV','PROTEGE','MILLENIA','B2300','B2500','B3000','B4000'],
 SUBARU: ['CROSSTREK','FORESTER','OUTBACK','IMPREZA','LEGACY','ASCENT','WRX','BRZ','SOLTERRA','TRIBECA','BAJA'],
 JEEP: ['GRAND CHEROKEE L','GRAND CHEROKEE','GRAND WAGONEER','WAGONEER','CHEROKEE','WRANGLER','GLADIATOR','COMPASS','RENEGADE','PATRIOT','LIBERTY','COMMANDER'],
 DODGE: ['GRAND CARAVAN','CHALLENGER','CHARGER','DURANGO','JOURNEY','HORNET','CARAVAN','AVENGER','DART','NITRO','CALIBER','MAGNUM','VIPER','RAM 1500','RAM 2500','RAM 3500'],
 RAM: ['1500','2500','3500','4500','5500','PROMASTER CITY','PROMASTER'],
 CHRYSLER: ['TOWN & COUNTRY','PACIFICA','VOYAGER','300','200','SEBRING','PT CRUISER','CROSSFIRE','ASPEN'],
 TESLA: ['MODEL 3','MODEL S','MODEL X','MODEL Y','CYBERTRUCK','ROADSTER'],
 VOLVO: ['XC90','XC60','XC40','EX90','EX60','EX40','EX30','EC40','C40','S90','S80','S70','S60','S40','V90','V70','V60','V50','V40','C70','C30'],
 INFINITI: ['QX80','QX70','QX60','QX55','QX50','QX30','QX56','Q70','Q60','Q50','Q40','G35','G37','M35','M37','M45','M56','FX35','FX37','FX45','FX50','EX35','EX37','JX35'],
 ACURA: ['INTEGRA','TLX','ILX','TSX','MDX','RDX','ZDX','RLX','RL','TL','NSX','RSX'],
 CADILLAC: ['ESCALADE ESV','ESCALADE EXT','ESCALADE IQ','ESCALADE','CT4','CT5','CT6','XT4','XT5','XT6','CTS','ATS','XTS','DTS','STS','SRX','LYRIQ','OPTIQ','VISTIQ','DEVILLE','SEVILLE'],
 BUICK: ['ENCORE GX','ENCORE','ENVISION','ENCLAVE','ENVISTA','LACROSSE','REGAL','VERANO','LUCERNE','LESABRE','PARK AVENUE','RENDEZVOUS','TERRAZA'],
 LINCOLN: ['NAVIGATOR L','NAVIGATOR','AVIATOR','CORSAIR','NAUTILUS','CONTINENTAL','TOWN CAR','MKZ','MKX','MKC','MKS','MKT','ZEPHYR'],
 LANDROVER: ['RANGE ROVER SPORT','RANGE ROVER VELAR','RANGE ROVER EVOQUE','RANGE ROVER','DISCOVERY SPORT','DISCOVERY','DEFENDER','FREELANDER','LR2','LR3','LR4'],
 JAGUAR: ['F-PACE','E-PACE','I-PACE','F-TYPE','X-TYPE','S-TYPE','XE','XF','XJ','XK'],
 GENESIS: ['GV60','GV70','GV80','G70','G80','G90'],
 MITSUBISHI: ['OUTLANDER SPORT','OUTLANDER','ECLIPSE CROSS','ECLIPSE','MIRAGE G4','MIRAGE','LANCER','ENDEAVOR','GALANT','MONTERO SPORT','MONTERO','RAIDER'],
 MINI: ['COUNTRYMAN','CLUBMAN','PACEMAN','COOPER','CONVERTIBLE','ROADSTER'],
 ALFAROMEO: ['STELVIO','GIULIA','TONALE','4C'],
 FIAT: ['500X','500L','500','124 SPIDER'],
 MASERATI: ['GRANTURISMO','GRANCABRIO','QUATTROPORTE','GHIBLI','LEVANTE','GRECALE','MC20'],
 BENTLEY: ['CONTINENTAL','FLYING SPUR','BENTAYGA','MULSANNE','ARNAGE'],
 ASTONMARTIN: ['DBX','DB11','DB12','DB9','DBS','VANTAGE','RAPIDE','VANQUISH'],
 ROLLSROYCE: ['GHOST','PHANTOM','WRAITH','DAWN','CULLINAN','SPECTRE'],
 LAMBORGHINI: ['URUS','HURACAN','AVENTADOR','GALLARDO','REVUELTO'],
 RIVIAN: ['R1S','R1T'], LUCID: ['AIR','GRAVITY'], POLESTAR: ['1','2','3','4'],
 SATURN: ['VUE','ION','AURA','OUTLOOK','SKY','RELAY'],
 SCION: ['FR-S','TC','XB','XA','XD','IM','IA','IQ'],
 PONTIAC: ['GRAND PRIX','GRAND AM','G6','G5','G8','VIBE','TORRENT','SOLSTICE','FIREBIRD','BONNEVILLE'],
 SUZUKI: ['GRAND VITARA','VITARA','SX4','KIZASHI','AERIO','FORENZA','RENO','XL7','XL-7'],
 SAAB: ['9-3','9-5','9-7X','9-4X'], HUMMER: ['H1','H2','H3','H3T'],
}
const normalize = (v:string) => v.trim().toUpperCase().replace(/[._/()-]+/g,' ').replace(/\s+/g,' ')
const compact = (v:string) => normalize(v).replace(/[^A-Z0-9]/g,'')
function rootMatch(value:string, root:string) {
 const a=normalize(value),b=normalize(root)
 return a===b || a.startsWith(b+' ')
}
export function modelFamily(make:string, model:string):string {
 const brand=compact(make)
 let value=normalize(model).replace(/^(?:ALL NEW|NEW) /,'')
 if(brand==='BMW'){
  value=value.replace(/^BMW /,'')
  const sport=value.match(/^(?:[1-8] SERIES )?(M[2-8])(?=$|\s)/)
  if(sport)return sport[1]
  if(/^[1-8]$/.test(value))return value+' SERIES'
  const series=value.match(/^([1-8]) SERIES\b/) || value.match(/^ACTIVEHYBRID ([1-8])\b/) || value.match(/^M?([1-8])\d{2}(?=$|[A-Z\s])/)
  if(series)return series[1]+' SERIES'
  const suv=value.match(/^(X[1-7]|Z[1348]|I[34578]|IX|XM)(?=$|\s)/)
  if(suv)return suv[1]
  if(/^I3S\b/.test(value))return 'I3'
  return model.trim().toUpperCase()
 }
 if(['MERCEDES','MERCEDESBENZ'].includes(brand)){
  value=value.replace(/^(?:AMG|MAYBACH) /,'')
  if(/^EQ[ES]\b/.test(value)){
   const family=value.slice(0,3)
   return /\bSUV\b/.test(value)?family+' SUV':family
  }
  const family=value.match(/^(AMG GT|GT AMG|GT S AMG|GT|SPRINTER|ESPRINTER|METRIS|GLA|GLB|GLC|GLE|GLK|GLS|CLA|CLE|CLK|CLS|SLC|SLK|SL|CL|ML|GL|EQB|[ABCEGSR])(?=$|[\s\d])/)
  if(family){
   const root=family[1]
   if(['GT','GT AMG','GT S AMG','AMG GT'].includes(root))return 'AMG GT'
   return /^[ABCEGSR]$/.test(root)?root+'-CLASS':root==='ML'?'M-CLASS':root
  }
  if(/^M CLASS\b/.test(value))return 'M-CLASS'
 }
 if(brand==='LEXUS'){
  const family=value.match(/^(CT|ES|GS|GX|HS|IS|LC|LS|LX|NX|RC|RX|RZ|SC|TX|UX)(?=$|[\s\d])/)
  if(family)return family[1]
 }
 if(brand==='AUDI'){
  value=value.replace(/^RS ([3-7])\b/,'RS$1').replace(/^RS Q8\b/,'RSQ8').replace(/^Q 5\b/,'Q5')
  const family=value.match(/^(RSQ8|RS[3-7]|SQ[5-8]|[AS][3-8]|Q[3-8]|R8|TTS|TT)(?=$|\s)/)
  if(family){
   if(/\bE TRON\b/.test(value)&&['A6','S6','Q8','SQ8'].includes(family[1]))return family[1]+' E-TRON'
   if(/^TT RS\b/.test(value))return 'TT RS'
   return family[1]
  }
  if(/^(?:RS |S )?E TRON/.test(value))return /GT/.test(value)?'E-TRON GT':'E-TRON'
 }
 if(brand==='PORSCHE')value=value.replace(/^CAYENNEGTS\b/,'CAYENNE GTS').replace(/^PANAMERA4S\b/,'PANAMERA 4S')
 if(brand==='VOLKSWAGEN'){
  if(/^ATLAS CROS(?:S)?(?=$|\s)/.test(value))return 'ATLAS CROSS SPORT'
  if(/^(?:E GOLF|GTI|R32|CITY GOLF|GOLF)\b/.test(value))return 'GOLF'
  if(/^NEW BEETLE\b/.test(value))value=value.replace(/^NEW /,'')
 }
 if(brand==='TOYOTA'){
  if(/^COROLLA (?:CR|CRS)(?=$|\s)/.test(value))return 'COROLLA CROSS'
  if(/^CAMRY SOL(?:A)?(?=$|\s)/.test(value))return 'CAMRY SOLARA'
  if(/^GRAND HIGH(?=$|\s)/.test(value))return 'GRAND HIGHLANDER'
  value=value.replace(/^RAV[ -]?4\b/,'RAV4').replace(/^4 RUNNER\b/,'4RUNNER').replace(/^GR86\b/,'GR 86')
  if(/^LAND ?CRUIS(?:ER|R)?\b/.test(value))value=value.replace(/^LAND ?CRUIS(?:ER|R)?\b/,'LAND CRUISER')
 }
 if(brand==='FORD')value=value.replace(/^([FE])(\d{3})\b/,'$1 $2')
 if(brand==='NISSAN')value=value.replace(/^NV (\d{3,4})\b/,'NV$1')
 if(brand==='MAZDA'){
  value=value.replace(/^MAZDA ([2356])\b/,'MAZDA$1').replace(/^([2356])(?=$|\s)/,'MAZDA$1').replace(/^(CX|MX)(\d+)\b/,'$1 $2')
 }
 if(brand==='MINI'&&/\b(COUNTRYMAN|CLUBMAN|PACEMAN)\b/.test(value))return value.match(/\b(COUNTRYMAN|CLUBMAN|PACEMAN)\b/)![1]
 const list=roots[brand]
 if(list){
  const root=[...list].sort((a,b)=>b.length-a.length).find(root=>rootMatch(value,root))
  if(root)return root
 }
 // For additional makes, strip only explicit common trim suffixes, never engine numbers or model prefixes.
 const trim=value.match(/^(.+?)\s+(?:BASE|PREMIUM|PRESTIGE|LIMITED|PLATINUM|LUXURY|TOURING|SE|SEL|SXT|XLE|XSE|LX|EX)(?:\s|$)/)
 return trim?.[1] || model.trim().toUpperCase()
}
export type ModelDirectoryRow = { id:number; name:string }
export function groupModelDirectory(make:string,rows:ModelDirectoryRow[]) {
 const groups=new Map<string,number[]>()
 for(const row of rows){
  if(!Number.isSafeInteger(row.id)||!isEridanRoadModel(row.name,make))continue
  const family=modelFamily(make,row.name)
  const ids=groups.get(family)||[]
  if(!ids.includes(row.id))ids.push(row.id)
  groups.set(family,ids)
 }
 return groups
}
