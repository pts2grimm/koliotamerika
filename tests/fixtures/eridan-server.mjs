import { createServer } from 'node:http'
const requests = []
const images = [1, 2, 3].map(n => 'https://cs.copart.com/test-gallery-' + n + '.jpg')
const cars = Array.from({ length: 30 }, (_, i) => ({
 id: 1000 + i, lot_number: String(70000000 + i), auction: i < 15 ? 'copart' : 'iaai',
 make: { id: 1, name: 'BMW' }, model: { id: 10, name: 'X5', make_id: 1 },
 year: 2022 + i % 3, name: (2022 + i % 3) + ' BMW X5',
 cylinders: i < 15 ? '6' : i < 27 ? '6 Cyl' : '8 Cyl',
 vin: 'WBA' + String(i).padStart(14, '0'), fuel: 'GAS', currency: 'USD',
 item_type: 'VEHTYPE_V', title_type: 'Certificate of Title', title_state: 'GA',
 seller: 'Test Seller', state: 'GA', city: 'Macon', engine: '3.0L', transmission: 'Automatic', drive: 'AWD',
 status: 'active', highlights: ['RUNS AND DRIVES'], primary_damage: { id: 1, name: 'Front End' },
 current_bid: i === 0 ? 0 : i === 1 ? null : 5500 + i * 100, buy_now_price: i === 1 ? 9999 : null, final_bid: i === 1 ? 8888 : null, odometer: 45000, sale_date: '2030-10-12T14:00:00.000Z', images, thumb_url: 'https://cs.copart.com/test-gallery-thumb.jpg',
}))
cars.push({ ...cars[0], id: 2000, lot_number: '80000000', make: { id: 2, name: 'Ford' }, model: { id: 20, name: 'Mustang', make_id: 2 }, name: '2022 Ford Mustang', vin: '1FA00000000000001' })
cars.push({ ...cars[0], id: 3000, cylinders:'4', vin: 'JH200000000000001', lot_number: '81000000', item_type: 'VEHTYPE_M', make: { id: 3, name: 'Honda' }, model: { id: 30, name: 'CBR600RR', make_id: 3 }, name: '2022 Honda CBR600RR' })
cars.push({ ...cars[0], id: 4000, vin: 'CAT00000000000001', lot_number: '82000000', item_type: 'VEHTYPE_E', make: { id: 4, name: 'CATERPILLAR' }, model: { id: 40, name: 'D6', make_id: 4 }, name: 'Caterpillar excavator' })
cars.push({ ...cars[0], id: 5000, vin: 'SEA00000000000001', lot_number: '83000000', item_type: 'VEHTYPE_M', make: { id: 5, name: 'SEA RAY' }, model: { id: 50, name: 'BOAT', make_id: 5 }, name: 'Sea Ray boat' })
cars.push({ ...cars[0], id: 6000, vin: 'WBA00000000000099', lot_number: '84000000', images: [], name: '2022 BMW X5 incomplete gallery' })
// Backfilled historical sale has a newer ingestion ID than the active event.
cars.push({ ...cars[0], id: 9000, status: 'not_sold', sale_date: '2026-09-23T14:00:00Z', current_bid: 9000 })
cars.push({ ...cars[0], id: 9001, lot_number: '57397516', vin: 'TST00000057397516', name: '2020 PORSCHE MACAN S', make: {id:7,name:'PORSCHE'}, model: {id:70,name:'MACAN'}, status:'not_sold', sale_date:'2026-09-23T14:00:00Z', current_bid:5400 })
cars.push({ ...cars[0], id:8501, cylinders:'1', lot_number: '85000001', vin: 'TST00000085000001', item_type:'VEHTYPE_A', make:{id:8,name:'POLARIS'}, model:{id:80,name:'SPORTSMAN 570',make_id:8}, name:'2022 Polaris Sportsman 570', seller:'Example ATV Seller' })
cars.push({ ...cars[0], id:8502, cylinders:'2 Cyl', lot_number: '85000002', vin: 'TST00000085000002', auction:'iaai', item_type:'VEHTYPE_A', make:{id:9,name:'CF MOTO'}, model:{id:90,name:'UFORCE 1000',make_id:9}, name:'2022 CF MOTO UFORCE 1000', seller:'' })
cars.push({ ...cars[0], id:8503, lot_number: '85000003', vin: 'TST00000085000003', item_type:'VEHTYPE_U', make:{id:10,name:'FREIGHTLINER'}, model:{id:100,name:'CASCADIA',make_id:10}, name:'Freightliner Cascadia truck' })
cars.push({ ...cars[0], id:8504, lot_number: '85000004', vin: 'TST00000085000004', item_type:'VEHTYPE_S', make:{id:8,name:'POLARIS'}, model:{id:81,name:'RMK',make_id:8}, name:'Polaris RMK snowmobile' })
cars.push({ ...cars[0], id:8505, lot_number: '85000005', vin: 'TST00000085000005', item_type:'VEHTYPE_R', make:{id:2,name:'Ford'}, model:{id:21,name:'F550',make_id:2}, name:'Four Winds RV' })
cars[2].highlights = ['ENGINE START PROGRAM','AUTOCHECK','CERT-S','IV']
cars[3].highlights = ['ENHANCED VEHICLES','CERT-E','IV']
cars[4].highlights = ['ENHANCED VEHICLES','RUNS AND DRIVES']
cars[5].seller = 'Other Seller'
cars[6].seller = ''
cars.push({...cars[0],id:9500,lot_number:'86000001',vin:'TST00000086000001',status:'sold',sale_date:'2026-10-12T14:00:00Z',buy_now_price:15000})
cars.push({...cars[0],id:9501,lot_number:'86000002',vin:'TST00000086000002',auction:'iaai',status:'sold',sale_date:'2026-10-12T14:00:00Z'})
cars.push({...cars[0],id:9502,lot_number:'72239476',vin:'TST00000072239476',status:'active',sale_date:'2026-10-12T19:00:00Z',current_bid:12000})
const aliasMakes=['MERCEDES','MERCEDES BENZ','MERCEDES-BENZ','ROLLS ROYCE','ROLLS-ROYCE']
const aliasModels=aliasMakes.map((_,i)=>({id:201+i,name:i<3?['C300','AMG C 43','C-CLASS C300'][i]:'GHOST',make_id:101+i}))
const aliasCars=Array.from({length:36},(_,i)=>({...cars[0],id:50000+i,lot_number:String(95000000+i),auction:i%2?'iaai':'copart',make:{id:101+i%3,name:aliasMakes[i%3]},model:aliasModels[i%3],name:'2023 '+aliasMakes[i%3]+' '+aliasModels[i%3].name}))
let sitemapOutage=false
let aliasExamples=false
let searchOutage = false, transientSearchFailures = 0, expiredBackfill = false, familyExamples = false, sortExamples = false
const backfill = Array.from({length:600},(_,i)=>({...cars[0], id:20000+i, lot_number:String(88000000+i), sale_date:'2026-09-01T12:00:00Z'}))
const undated = [0,1].map(i=>({...cars[0],id:30000+i,lot_number:String(89000000+i),auction:i?'iaai':'copart',sale_date:null,seller:i?'Named company':' '}))
const familyModels=[{id:101,name:'3 SERIES',make_id:1},{id:102,name:'328I',make_id:1},{id:103,name:'330',make_id:1},{id:104,name:'M340I',make_id:1},{id:105,name:'4 SERIES',make_id:1}]
const familyCars=Array.from({length:32},(_,i)=>({...cars[0],id:40000+i,lot_number:String(93000000+i),auction:i%2?'iaai':'copart',model:familyModels[i%4],name:'2023 BMW '+familyModels[i%4].name,year:2023}))
familyCars.push({...cars[0],id:41000,lot_number:'94000000',model:familyModels[4],name:'2023 BMW 4 SERIES',year:2023})
createServer((req, res) => {
 const url = new URL(req.url, 'http://127.0.0.1'), p = url.searchParams
 const send = (data, status = 200) => {
  const finish=()=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data))}
  if(url.pathname==='/lots'&&p.get('year_from')==='1997')setTimeout(finish,1800)
  else finish()
 }
 if (url.pathname === '/test-make-aliases' && req.method === 'POST') { aliasExamples=p.get('enabled')==='true'; return send({ok:true}) }
 if (url.pathname === '/test-sitemap-outage' && req.method === 'POST') { sitemapOutage=p.get('enabled')==='true'; return send({ok:true}) }
 if (url.pathname === '/') return send({ ok: true })
 if (url.pathname === '/test-sort-examples' && req.method === 'POST') { sortExamples = p.get('enabled') === 'true'; return send({ok:true}) }
 if (url.pathname === '/test-model-families' && req.method === 'POST') { familyExamples = p.get('enabled') === 'true'; return send({ok:true}) }
 if (url.pathname === '/test-expired-backfill' && req.method === 'POST') { expiredBackfill = p.get('enabled') === 'true'; return send({ok:true}) }
 if (url.pathname === '/test-requests') return send({ requests })
 if (url.pathname === '/test-search-outage' && req.method === 'POST') { searchOutage = p.get('enabled') === 'true'; return send({ok:true}) }
 if (url.pathname === '/test-transient-search' && req.method === 'POST') { transientSearchFailures = 1; return send({ok:true}) }
 if (req.headers.authorization !== 'Bearer eridan-local-fixture') return send({ error: 'unauthorized' }, 401)
 requests.push({ path: url.pathname, params: Object.fromEntries(p) })
 if (url.pathname === '/item_types') return send([{ value: 'VEHTYPE_V', label: 'Vehicle' }, { value: 'VEHTYPE_M', label: 'Motorcycle' }, { value: 'VEHTYPE_A', label: 'ATV' }])
 if (url.pathname === '/fuel_types') return send(['GAS', 'DIESEL', 'ELECTRIC', 'HYBRID ENGINE'])
 if (url.pathname === '/makes') return send({ items: [{ id: 1, name: 'BMW' }, { id: 2, name: 'Ford' }, { id: 3, name: 'Honda' }, { id: 4, name: 'CATERPILLAR' }, { id: 5, name: 'SEA RAY' }, { id: 6, name: '*' }, {id:8,name:'POLARIS'}, {id:9,name:'CF MOTO'},...aliasMakes.map((name,i)=>({id:101+i,name}))], count: 13 })
 if (url.pathname === '/models') {
  const aliasIndex=aliasMakes.indexOf(p.get('make__name'))
  if(aliasIndex>=0)return send({items:[aliasModels[aliasIndex]],count:1})
  const models = p.get('make__name') === 'BMW' ? [{ id: 10, name: 'X5', make_id: 1 }, { id: 11, name: 'X3', make_id: 1 }, ...familyModels] : p.get('make__name') === 'Ford' ? [{ id: 20, name: 'Mustang', make_id: 2 }] : p.get('make__name') === 'Honda' ? [{ id: 30, name: 'CBR600RR', make_id: 3 }] : p.get('make__name') === 'POLARIS' ? [{id:80,name:'SPORTSMAN 570',make_id:8}] : p.get('make__name') === 'CF MOTO' ? [{id:90,name:'UFORCE 1000',make_id:9}] : []
  return send({ items: models, count: models.length })
 }
 if(url.pathname==='/lots'&&p.get('lot_number')==='64492136')return send({items:[{...cars[0],id:9100,lot_number:'64492136',vin:'TST00000064492136',name:'2013 BMW 3 SERIES',sale_date:null,status:'active'}],page:1,page_size:10,has_next:false})
 // A detail-only fixture proves streaming while the upstream lookup is slow.
 if (url.pathname === '/lots' && p.get('lot_number') === '79999001') {
  setTimeout(()=>send({ items: [{ ...cars[0], id: 99999, lot_number: '79999001', name: '2023 BMW X5 streaming fixture' }], page: 1, page_size: 10, has_next: false }), 2000)
  return
 }
 if (url.pathname !== '/lots') return send({ error: 'unknown endpoint' }, 404)
 if (searchOutage && p.get('year_from') === '2019' && p.get('year_to') === '2023') {
  return send({ error: 'temporary fixture outage' }, 503)
 }
 if (transientSearchFailures && p.get('year_from') === '2018' && p.get('year_to') === '2023') {
  transientSearchFailures--; return send({ error: 'one temporary gateway failure' }, 503)
 }
 if(sitemapOutage && p.get('sale_date__lte') && ['VEHTYPE_M','VEHTYPE_A'].includes(p.get('item_type'))) return send({error:'temporary sitemap fixture outage'},503)
 const allowed = ['page', 'page_size', 'ordering', 'auction', 'lot_number', 'vin', 'make__name', 'model__name', 'model_ids', 'year_from', 'year_to', 'fuel_type__name', 'item_type', 'has_images', 'makes', 'status', 'sale_date__lte', 'sale_date__gte', 'sale_date__isnull']
 if ([...p.keys()].some(key => !allowed.includes(key))) return send({ error: 'unknown filter' }, 422)
 const items = [...cars.map((car,i)=>sortExamples&&i<30?{...car,sale_date:i>27?null:new Date(Date.UTC(2032,0,1+(29-i))).toISOString(),created_at:new Date(Date.UTC(2026,0,i+1)).toISOString()}:car),...(aliasExamples ? aliasCars : []),...(familyExamples ? familyCars : []),...(expiredBackfill ? [...backfill,...undated] : [])].filter(car =>
  (!p.get('sale_date__gte') || car.sale_date && Date.parse(car.sale_date) >= Date.parse(p.get('sale_date__gte'))) &&
  (p.get('sale_date__isnull') !== 'true' || car.sale_date == null) &&
  (!p.get('sale_date__lte') || car.sale_date && Date.parse(car.sale_date) <= Date.parse(p.get('sale_date__lte'))) &&
  (!p.get('has_images') || car.images.length > 0) &&
  (!p.has('makes') || p.getAll('makes').at(-1).split(',').some(make => make.toLowerCase() === car.make.name.toLowerCase())) &&
  ['auction', 'lot_number', 'vin', 'item_type', 'status'].every(key => !p.get(key) || car[key] === p.get(key)) &&
  (!p.get('make__name') || car.make.name === p.get('make__name')) &&
  (!p.get('model_ids') || p.get('model_ids').split(',').map(Number).includes(car.model.id)) &&
  (!p.get('model__name') || car.model.name === p.get('model__name')) &&
  (!p.get('fuel_type__name') || car.fuel === p.get('fuel_type__name')) &&
  (!p.get('year_from') || car.year >= Number(p.get('year_from'))) &&
  (!p.get('year_to') || car.year <= Number(p.get('year_to')))
 )
 items.sort((a,b)=>{
  for(const field of (p.get('ordering')||'-id').split(',')){
   const key=field.replace(/^-/,''); const av=a[key],bv=b[key]
   if(av===bv)continue
   if(av==null)return 1
   if(bv==null)return -1
   return (av<bv?-1:1)*(field.startsWith('-')?-1:1)
  }
  return b.id-a.id
 })
 const page = Number(p.get('page') || 1), size = Number(p.get('page_size') || 24)
 send({ items: items.slice((page - 1) * size, page * size), page, page_size: size, has_next: page * size < items.length })
}).listen(3199, '127.0.0.1')
