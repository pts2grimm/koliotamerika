import type {Payload} from 'payload'
import type {MigrateUpArgs} from '@payloadcms/db-sqlite'
export function sqliteDatabase(payload:Payload):MigrateUpArgs['db'] {
  if(payload.db.name === 'postgres') throw new Error('SQLite fixture cannot run against PostgreSQL')
  return payload.db.drizzle as unknown as MigrateUpArgs['db']
}
