import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import additions from '../content/pricing-details-2026-10.json'
test('illustrative import budget adds up, including the VAT base and conditional exchange rate',()=>{
 const dom=new JSDOM(additions[0].html)
 const tables=dom.window.document.querySelectorAll('table')
 assert.equal(tables.length,4)
 const rows=[...tables[3].querySelectorAll('tr')].slice(1).map(row=>[...row.querySelectorAll('td')].map(cell=>cell.textContent||''))
 const number=(s:string)=>Number(s.replace(/[^0-9.]/g,''))
 const usd=rows.slice(0,9).reduce((sum,row)=>sum+number(row[1]),0)
 const eur=rows.slice(0,9).reduce((sum,row)=>sum+number(row[2]),0)
 assert.equal(usd,number(rows[9][1]))
 assert.equal(Math.round(usd*0.9*100),Math.round(eur*100))
 assert.equal(Math.round(eur*100),Math.round(number(rows[9][2])*100))
 const duty=number(rows[10][2]),port=number(rows[11][2]),delivery=number(rows[12][2]),vat=number(rows[13][2]),commission=number(rows[14][2])
 assert.equal(Math.round(eur*0.1*100),Math.round(duty*100))
 assert.equal(Math.round((eur+duty+port+delivery)*0.2*100),Math.round(vat*100))
 assert.equal(Math.round((eur+duty+port+delivery+vat+commission)*100),Math.round(number(rows[15][2])*100))
 assert.match(additions[0].html,/member-fees-us-non-licensed/)
 assert.doesNotMatch(additions[0].html,/member-fees-us-licensed/)
 dom.window.close()
})
