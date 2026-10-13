const key = process.env.ERIDAN_API_KEY?.trim();
if (!key) { console.error('Missing protected credential'); process.exit(1); }
try {
 const url = new URL('https://catalog.eridan.software/api/lots');
 url.search = new URLSearchParams({lot_number:'57397516',auction:'copart',ordering:'-sale_date',page:'1',page_size:'100'}).toString();
 const response = await fetch(url, {headers:{Accept:'application/json',Authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(30000)});
 console.log('LOT_REQUEST', JSON.stringify({checkedAt:new Date().toISOString(),url:url.href,httpStatus:response.status}));
 if (!response.ok) process.exit(1);
 const data = await response.json();
 const fields = ['id','lot_number','auction','vin','name','make','model','series','year','item_type','color','trim','body_style','engine','transmission','drive','fuel','cylinders','odometer','odometer_status','primary_damage','secondary_damage','title_type','title_state','has_keys','highlights','status','sale_date','is_future_sale','auction_last_update','current_bid','buy_now_price','final_bid','retail_value','repair_cost','seller','yard','city','state','country','currency','thumb_url','images','created_at','updated_at','date_parsed'];
 console.log('LOT_PAGINATION',JSON.stringify(Object.fromEntries(Object.entries(data).filter(([key,value])=>key!=='items' && (value===null || ['string','number','boolean'].includes(typeof value))))));
 for (const row of data.items || []) {
  if (String(row.lot_number)!=='57397516' || row.auction!=='copart') throw new Error('Unexpected lot');
  console.log('LOT_RECORD',JSON.stringify(Object.fromEntries(fields.filter(f=>Object.hasOwn(row,f)).map(f=>[f,row[f]]))));
 }
 console.log('LOT_RECORD_COUNT',data.items?.length);
} catch { console.error('Lot inspection failed; no credentials or upstream error body logged.'); process.exitCode=1; }
