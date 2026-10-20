import assert from 'node:assert/strict'
import test from 'node:test'
import {invoiceAmounts,invoiceFees,invoicePastDue,invoiceParties,invoiceSnapshot} from '../src/lib/invoice'
const zero=Object.fromEntries(invoiceFees.map(([key])=>[key,0]))
test('invoice totals use cents across cars and do not infer payment',()=>{
 assert.deepEqual(invoiceAmounts([{...zero,delivery:675,shipping:563,storage:10,addServices:21}],0),{rowTotals:[1269],total:1269,balance:1269})
 assert.deepEqual(invoiceAmounts([{...zero,delivery:.1,shipping:.2},{...zero,evFee:.3}],.2),{rowTotals:[.3,.3],total:.6,balance:.4})
 for(const amount of [-1,NaN,Infinity,.001,'5',null,100000000])assert.throws(()=>invoiceAmounts([{...zero,storage:amount}],0))
 for(const rows of [null,[],Array(51).fill(zero)])assert.throws(()=>invoiceAmounts(rows,0))
 assert.throws(()=>invoiceAmounts([zero],.01))
 assert.equal(invoiceAmounts([{...zero,delivery:99999999.99,shipping:99999999.99}],0).total,199999999.98)
})
test('past due depends on actual due date, outstanding amount and Sofia date',()=>{
 assert.equal(invoicePastDue('2026-10-19',5,'2026-10-21'),2)
 assert.equal(invoicePastDue('2026-10-19',0,'2026-10-21'),0)
 assert.equal(invoicePastDue('2026-10-23',5,'2026-10-21'),0)
 assert.equal(invoicePastDue(undefined,5),0)
 const snapshot=invoiceSnapshot({account:'000000000001',routingElectronic:'000000001',routingWire:'000000002'})
 assert.deepEqual(invoiceParties(snapshot),snapshot)
 assert.throws(()=>invoiceSnapshot({}))
 assert.throws(()=>invoiceParties({version:1,seller:{},buyer:{},bank:{}}))
})
