import { Client } from 'pg'
import type { ClientConfig } from 'pg'
import type { EventEmitter } from 'node:events'
import { databaseTraffic, queryLabel, type TrafficLabel } from './database-traffic'

// pg 8.16.x protocol events are observed BEFORE Client consumes them. No query
// wrapping, additional queries, result serialization, or parameter/result storage.
// Keep the protocol integration test when upgrading pg.
export class MeteredPostgresClient extends Client {
 constructor(config?:ClientConfig) {
  super(config)
  const internal=this as unknown as {connection:EventEmitter;activeQuery?:{text?:unknown}}
  const labels=new WeakMap<object,TrafficLabel>()
  databaseTraffic.attach()
  const observe=(event:'rowDescription'|'dataRow'|'commandComplete'|'errorMessage')=>{
   internal.connection.prependListener(event,(message:{length?:number})=>{
    try {
     const query=internal.activeQuery
     if(!query)return // Authentication/connection errors are not SQL results.
     let label=labels.get(query)
     if(!label){label=queryLabel(query.text);labels.set(query,label)}
     const bytes=event==='errorMessage'?0:typeof message.length==='number'?message.length+1:0
     databaseTraffic.record(label,bytes,event==='dataRow'?1:0,event==='commandComplete'||event==='errorMessage'?1:0,event==='errorMessage'?1:0)
    } catch { /* Observability must never change database behavior. */ }
   })
  }
  observe('rowDescription');observe('dataRow');observe('commandComplete');observe('errorMessage')
 }
}
