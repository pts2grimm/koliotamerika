import assert from 'node:assert/strict'
const base='http://localhost:3100'
const request=(path,init={})=>fetch(base+path,{...init,redirect:'manual'})
const post=(path,data,headers={})=>request(path,{method:'POST',headers:{'Content-Type':'application/json',Origin:base,...headers},body:JSON.stringify(data)})
const cookie=response=>response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ')
let ready=false
for(let i=0;i<90;i++){try{const r=await request('/api/admin/database-traffic');if(r.status===403){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,1000))}
assert(ready,'Server did not become ready')
const guest=await request('/api/admin/database-traffic')
assert.equal(guest.status,403);assert.match(guest.headers.get('cache-control'),/no-store/)
const customer=await post('/api/account/login',{email:'egress-customer@example.test',password:'Egress-test-password-2026'})
assert.equal(customer.status,200)
const customerToken=cookie(customer).split('koa-customer=')[1]?.split(';')[0]
assert(customerToken)
assert.equal((await request('/api/admin/database-traffic',{headers:{Authorization:'JWT '+customerToken}})).status,403)
assert.equal((await request('/api/admin/database-traffic',{headers:{Cookie:cookie(customer)}})).status,403)
const login=await post('/api/users/login',{email:'egress-admin@example.test',password:'Egress-test-password-2026'})
assert.equal(login.status,200)
const adminHeaders={Cookie:cookie(login),'Sec-Fetch-Site':'same-origin'}
assert(adminHeaders.Cookie.includes('payload-token='))
assert.equal((await request('/api/admin/database-traffic',{headers:{...adminHeaders,'Sec-Fetch-Site':'cross-site',Origin:'https://untrusted.example'}})).status,403)
const response=await request('/api/admin/database-traffic',{headers:adminHeaders})
assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/)
const report=await response.json()
assert(report.driverAttached);assert(report.total.queries>0)
assert(report.total.approximateBytes>0)
const json=JSON.stringify(report)
assert(!json.includes('example.test'));assert(!json.includes('Egress-test-password'));assert(!json.includes('Fixture introduction'))
assert(report.breakdown.every((row,i)=>i===0||row.approximateBytes<=report.breakdown[i-1].approximateBytes))
const view=await request('/admin/database-traffic',{headers:adminHeaders})
assert.equal(view.status,200)
const html=await view.text()
assert(html.includes('Трафик на базата'));assert(html.includes('Изтегли отчет'));assert(html.includes('Обнови'))
const guestView=await request('/admin/database-traffic')
const guestHTML=await guestView.text()
assert(!guestHTML.includes('measuredThrough')&&!guestHTML.includes('processInstance'))
// Next can stream a redirect/login shell with HTTP 200 after headers are sent.
assert([302,303,307,308].includes(guestView.status)||guestView.status===200&&(/\/admin\/login|Вход|Log in|Login/.test(guestHTML)))
for(const path of ['/blog','/avtomobili','/egress-fixture-0','/avtomobili/egress-car-0','/sitemap.xml']){
 const r=await request(path);assert.equal(r.status,200,path)
 const text=await r.text();assert(!text.includes("This page couldn’t load"),path)
 if(path==='/blog')assert(text.includes('egress-fixture-'))
 if(path==='/sitemap.xml')assert(text.includes('/egress-fixture-0'))
}
const content=await request('/admin/blog-posts',{headers:adminHeaders})
assert.equal(content.status,200)
assert((await content.text()).includes('Fixture article'))
// Edit invalidation of the NEW sitemap cache, with normal admin session and CSRF checks.
const find=async(collection,slug)=>{
 const r=await request('/api/'+collection+'?where[slug][equals]='+slug,{headers:adminHeaders})
 assert.equal(r.status,200)
 return (await r.json()).docs[0]
}
const patch=async(collection,id,data)=>{
 const r=await request('/api/'+collection+'/'+id,{method:'PATCH',headers:{...adminHeaders,Origin:base,'Content-Type':'application/json'},body:JSON.stringify(data)})
 assert.equal(r.status,200)
}
const sitemap=async()=>(await request('/sitemap.xml')).text()
const poll=async(check,timeout=5000)=>{
 const start=Date.now()
 while(Date.now()-start<timeout){if(await check())return;await new Promise(r=>setTimeout(r,500))}
 assert.fail('Expected cache state did not become visible')
}
const article=await find('pages','egress-fixture-0')
await sitemap()
await patch('pages',article.id,{status:'draft'})
await poll(async()=>!(await sitemap()).includes('/egress-fixture-0'))
assert.equal((await request('/egress-fixture-0')).status,404)
await patch('pages',article.id,{status:'published',publishedAt:new Date(Date.now()+4000).toISOString()})
assert(!(await sitemap()).includes('/egress-fixture-0'))
await poll(async()=>(await sitemap()).includes('/egress-fixture-0'),40000)
const car=await find('cars','egress-car-0')
await patch('cars',car.id,{status:'draft'})
await poll(async()=>!(await sitemap()).includes('/avtomobili/egress-car-0'))
const redirect=await post('/api/redirects',{from:'/egress-fixture-1',to:'/blog'},adminHeaders)
assert.equal(redirect.status,201)
await poll(async()=>!(await sitemap()).includes('/egress-fixture-1'))
console.log('PASS: sitemap edits, unpublishing, timed release, car and redirect invalidation.')
console.log('PASS: anonymous/customer denied; existing administrator cookie accepted; no-store; report privacy and sorting; admin view; public list/detail/sitemap routes.')
