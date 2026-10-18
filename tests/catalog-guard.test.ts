import assert from 'node:assert/strict'
import test from 'node:test'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { canonicalIP,guardIdentity,guardLimits,guardScope,safeAgent } from '../src/lib/catalog-guard'
import { createCrawlerVerifier } from '../src/lib/verified-crawler'

test('catalogue boundary includes RSC paths, encoded paths, models and archives but not SEO/admin/assets',()=>{
 for(const p of ['/targove','/targove/','/targove/kola','/targove/motori-atv/arhiv','/api/auction-models','/%74argove/kola']) assert.ok(guardScope(p),p)
 for(const p of ['/','/blog','/admin','/api/users/login','/robots.txt','/sitemap.xml','/sitemap-index.xml','/api/media/file/a.jpg','/_next/image','/targove-other']) assert.equal(guardScope(p),undefined,p)
 assert.equal(canonicalIP('2001:0db8:0:0:0:0:0:1'),'2001:db8::1')
 assert.equal(canonicalIP('::ffff:192.0.2.1'),'192.0.2.1')
 assert.equal(guardIdentity('2001:db8:1:2::1'),guardIdentity('2001:db8:1:2::999'))
 assert.notEqual(guardIdentity('2001:db8:1:2::1'),guardIdentity('2001:db8:1:3::1'))
 assert.equal(canonicalIP('bad'),'')
 assert.deepEqual(guardLimits({}),{minute:120,hour:1200})
 assert.deepEqual(guardLimits({CATALOG_RATE_PER_MINUTE:'0',CATALOG_RATE_PER_HOUR:'NaN'}),{minute:120,hour:1200})
 assert.equal(safeAgent('a\nb'+'x'.repeat(999)).length,300)
})
test('only forward-confirmed Google/Bing DNS earns exemption; spoofing names cannot',async()=>{
 const ip='192.0.2.1'
 const verify=(hosts:string[],addresses:string[])=>createCrawlerVerifier(()=>({reverse:async()=>hosts,forward:async()=>addresses,cancel:()=>{}}))
 assert.equal(await verify(['crawl-192-0-2-1.googlebot.com'],[ip])(ip,'Googlebot'),'Google')
 assert.equal(await verify(['msnbot-192-0-2-1.search.msn.com'],[ip])(ip,'bingbot'),'Bing')
 assert.equal(await verify(['crawl-192-0-2-1.googlebot.com.evil.test'],[ip])(ip,'Googlebot'),'')
 assert.equal(await verify(['evilgooglebot.com'],[ip])(ip,'Googlebot'),'')
 assert.equal(await verify(['crawl-192-0-2-1.googlebot.com'],['192.0.2.2'])(ip,'Googlebot'),'')
 assert.equal(await verify(['ec2-192-0-2-1.compute.amazonaws.com'],[ip])(ip,'Googlebot'),'')
 assert.equal(await verify(['crawl-192-0-2-1.googlebot.com'],[ip])(ip,'Mozilla'),'')
})
test('DNS concurrency coalesces and successful verification expires',async()=>{
 let calls=0,now=0
 const check=createCrawlerVerifier(()=>({reverse:async()=>{calls++;return ['crawl-192-0-2-1.googlebot.com']},forward:async()=>['192.0.2.1'],cancel:()=>{}}),()=>now)
 assert.deepEqual(await Promise.all(Array.from({length:20},()=>check('192.0.2.1','Googlebot'))),Array(20).fill('Google'))
 assert.equal(calls,1)
 await check('192.0.2.1','Googlebot');assert.equal(calls,1)
 now=3600001;await check('192.0.2.1','Googlebot');assert.equal(calls,2)
})
test('production SQLite enforces shared atomic quotas, retention, capacity and IPv6 grouping', {timeout:120000},()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'koa-guard-'))
 try{
  const result=spawnSync(process.execPath,['--import','tsx','tests/fixtures/catalog-guard.ts'],{
   cwd:process.cwd(),encoding:'utf8',timeout:115000,
   env:{PATH:process.env.PATH,NODE_ENV:'production',PREVIEW_MODE:'false',PAYLOAD_SECRET:'isolated-guard-ci-secret',DATABASE_URI:'file:'+path.join(dir,'test.db'),MEDIA_DIR:path.join(dir,'media'),NEXT_PUBLIC_SERVER_URL:'http://localhost:3000'},
  })
  assert.ifError(result.error);assert.equal(result.status,0,result.stdout+result.stderr)
 }finally{rmSync(dir,{recursive:true,force:true})}
})
