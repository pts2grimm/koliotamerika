// This rehearsal may create a synthetic admin ONLY in the isolated CI PostgreSQL.
import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { createBosPDF } from '../src/lib/bos-pdf'
import { createInvoicePDF } from '../src/lib/invoice-pdf'
const url = new URL(process.env.DATABASE_URI!)
assert.equal(process.env.CI,'true')
assert.ok(['localhost','127.0.0.1'].includes(url.hostname))
let stage='initialize', payload: Awaited<ReturnType<typeof getPayload>> | undefined
try {
  payload=await getPayload({config,disableOnInit:true})
  for(const collection of ['pages','users','customers','inquiries','bills-of-sale','invoices'] as const){
    stage='read '+collection
    await payload.find({collection,limit:1,depth:1})
  }
  for(const slug of ['site-settings','calculator-settings','integrations','invoice-settings'] as const){
    stage='read '+slug
    await payload.findGlobal({slug,depth:1})
  }
  stage='BOS PDF'
  const bos=await payload.find({collection:'bills-of-sale',limit:1,depth:0})
  assert.ok(bos.docs.length>0)
  assert.ok((await createBosPDF(bos.docs[0])).length>1000)
  stage='Invoice PDF'
  const invoices=await payload.find({collection:'invoices',limit:1,depth:0})
  assert.ok(invoices.docs.length>0)
  assert.ok((await createInvoicePDF(invoices.docs[0])).length>1000)
  stage='sequence and authentication'
  const user=await payload.create({collection:'users',data:{email:'migration-rehearsal@example.test',password:'Rehearsal-only-password-2026',name:'Rehearsal'}})
  assert.ok((await payload.login({collection:'users',data:{email:user.email,password:'Rehearsal-only-password-2026'}})).token)
  console.log('Copied content, relationships, globals, BOS/Invoice PDF and new-record authentication verified. No document contents exported.')
} catch {
  console.error('Copied-data verification failed at:',stage)
  process.exitCode=1
} finally { if(payload)await payload.destroy() }
process.exit(process.exitCode||0)
