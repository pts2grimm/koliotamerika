import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { guardAdminAuth } from '../src/lib/admin-auth-request'

test('parallel reservations, expiry, bounded storage and HMAC keys on real migrated SQLite', {timeout:120000}, () => {
 const dir=mkdtempSync(path.join(tmpdir(),'koa-security-'))
 try {
  const result=spawnSync(process.execPath,['--import','tsx','tests/fixtures/security-limits.ts'],{encoding:'utf8',timeout:110000,env:{
   PATH:process.env.PATH,NODE_ENV:'production',PREVIEW_MODE:'false',DATABASE_URI:'file:'+path.join(dir,'payload.db'),
   MEDIA_DIR:path.join(dir,'media'),PAYLOAD_SECRET:'isolated-security-test-secret',
   NEXT_PUBLIC_SERVER_URL:'http://localhost:3000',
  }})
  assert.ifError(result.error)
  assert.equal(result.status,0,result.stdout+result.stderr)
 }finally{rmSync(dir,{recursive:true,force:true})}
})
test('admin guard rejects unsafe inputs before initializing Payload', async()=>{
 const unavailable=async()=>{throw new Error('Must not access storage')}
 const make=(body:string,headers:Record<string,string>={})=>new Request('http://localhost:3000/api/users/login',{method:'POST',headers:{'content-type':'application/json',...headers},body})
 for(const [request,status] of [
  [make('{}',{origin:'https://attacker.example'}),403],
  [make('{}',{'sec-fetch-site':'cross-site'}),403],
  [make('{}',{'content-type':'text/plain'}),415],
  [make('{bad'),400],[make('[]'),400],[make('x'.repeat(17000)),413],
  [make(JSON.stringify({password:'x'.repeat(129)})),400],
  [make(JSON.stringify({email:{bad:'type'}})),400],
 ] as const){
  const response=await guardAdminAuth(request,'login',unavailable)
  assert.ok(response instanceof Response)
  assert.equal(response.status,status)
 }
 const result=await guardAdminAuth(make('{"email":"test@example.test","password":"test12345"}'),'login',unavailable)
 assert.ok(result instanceof Response)
 assert.equal(result.status,503)
})
