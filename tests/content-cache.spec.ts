import { test, expect } from '@playwright/test'
test('public cache refreshes edits, settings, unpublishing and timed release',async({playwright})=>{
 const baseURL='http://localhost:3100'
 const visitor=await playwright.request.newContext({baseURL})
 const admin=await playwright.request.newContext({baseURL})
 try{
  // Informational timings: no flaky speed threshold on shared CI machines.
  for(const route of ['/blog','/koli-ot-manheim']){
   const times=[]
   for(let i=0;i<3;i++){const start=Date.now();const response=await visitor.get(route);expect(response.status()).toBe(200);await response.body();times.push(Date.now()-start)}
   console.log(JSON.stringify({route,totalResponseMs:times}))
  }
  expect((await admin.post('/api/users/first-register',{data:{email:'cache@example.test',password:'Cache-test-password-2026',name:'Cache test'}})).ok()).toBe(true)
  const login=await admin.post('/api/users/login',{data:{email:'cache@example.test',password:'Cache-test-password-2026'}})
  const headers={Authorization:'JWT '+(await login.json()).token}
  const slug='cache-release-test'
  const created=await admin.post('/api/pages',{headers,data:{slug,title:'Cache release original',intro:'Public content cache test',kind:'article',status:'draft'}})
  expect(created.ok(),await created.text()).toBe(true)
  const doc=(await created.json()).doc
  expect((await visitor.get('/'+slug)).status()).toBe(404)
  expect((await visitor.get('/'+slug)).status()).toBe(404)
  // Staff may read the draft, but that must not seed the public page cache.
  expect((await admin.get('/api/pages/'+doc.id,{headers})).status()).toBe(200)
  expect((await visitor.get('/'+slug)).status()).toBe(404)
  await visitor.get('/blog')
  const updated=await admin.patch('/api/pages/'+doc.id,{headers,data:{status:'published',publishedAt:new Date(Date.now()-1000).toISOString()}})
  expect(updated.ok(),await updated.text()).toBe(true)
  await expect.poll(async()=>(await visitor.get('/'+slug)).status(),{timeout:5000}).toBe(200)
  await expect.poll(async()=>await(await visitor.get('/blog')).text(),{timeout:5000}).toContain('href="/'+slug+'"')
  await admin.patch('/api/pages/'+doc.id,{headers,data:{title:'Cache release updated'}})
  await expect.poll(async()=>await(await visitor.get('/'+slug)).text(),{timeout:5000}).toContain('Cache release updated')
  const site=await admin.post('/api/globals/site-settings',{headers,data:{brand:'Cache verified brand'}})
  expect(site.ok(),await site.text()).toBe(true)
  await expect.poll(async()=>await(await visitor.get('/blog')).text(),{timeout:5000}).toContain('Cache verified brand')
  await admin.patch('/api/pages/'+doc.id,{headers,data:{status:'draft'}})
  await expect.poll(async()=>(await visitor.get('/'+slug)).status(),{timeout:5000}).toBe(404)
  await expect.poll(async()=>await(await visitor.get('/blog')).text(),{timeout:5000}).not.toContain('href="/'+slug+'"')
  // No edit/cron fires at the release time. A hard TTL must reveal the article.
  const releaseAt=new Date(Date.now()+8000).toISOString()
  await admin.patch('/api/pages/'+doc.id,{headers,data:{status:'published',publishedAt:releaseAt}})
  expect((await visitor.get('/'+slug)).status()).toBe(404)
  expect(await(await visitor.get('/blog')).text()).not.toContain('href="/'+slug+'"')
  await expect.poll(async()=>(await visitor.get('/'+slug)).status(),{timeout:45000,intervals:[1000,2000]}).toBe(200)
  expect(Date.now()).toBeGreaterThanOrEqual(Date.parse(releaseAt))
  await expect.poll(async()=>await(await visitor.get('/blog')).text(),{timeout:10000}).toContain('href="/'+slug+'"')
  await admin.delete('/api/pages/'+doc.id,{headers})
  await expect.poll(async()=>(await visitor.get('/'+slug)).status(),{timeout:5000}).toBe(404)
 }finally{await admin.dispose();await visitor.dispose()}
})
