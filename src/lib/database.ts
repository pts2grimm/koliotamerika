import { sql, type SQL } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { Payload } from 'payload'
import type { Pool } from 'pg'
export { sql }
type SQLiteQueries = { all<T = Record<string, unknown>>(query: SQL): Promise<T[]>; run(query: SQL): Promise<unknown> }
type RuntimeAdapter = { name?: string; pool?: Pool; drizzle: SQLiteQueries }
const dialect = new PgDialect()
export function database(payload: Payload) {
  const adapter = payload.db as unknown as RuntimeAdapter
  const postgres = adapter.name === 'postgres'
  async function execute<T>(query: SQL, lock?: string): Promise<T[]> {
    if (!postgres) return adapter.drizzle.all<T>(query)
    if (!adapter.pool) throw new Error('PostgreSQL pool is unavailable')
    const client = await adapter.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('SET LOCAL search_path TO payload')
      await client.query("SET LOCAL lock_timeout = '5s'")
      await client.query("SET LOCAL statement_timeout = '15s'")
      // Serialize bounded inserts across processes; row locks alone do not protect COUNT caps.
      if (lock) await client.query('SELECT pg_advisory_xact_lock(1701022, hashtext($1))', [lock])
      const compiled = dialect.sqlToQuery(query)
      const result = await client.query(compiled.sql, compiled.params)
      await client.query('COMMIT')
      return result.rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => {
        if (value instanceof Date) return [key, value.toISOString()]
        if (typeof value === 'boolean') return [key, Number(value)]
        if (key === 'filters' && value && typeof value === 'object') return [key, JSON.stringify(value)]
        const field = result.fields.find(field => field.name === key)
        if (typeof value === 'string' && [20, 1700].includes(field?.dataTypeID ?? 0)) {
          const number = Number(value)
          if (Number.isFinite(number) && Math.abs(number) <= Number.MAX_SAFE_INTEGER) return [key, number]
        }
        return [key, value]
      }))) as T[]
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    } finally { client.release() }
  }
  return {
    postgres,
    all: <T = Record<string, unknown>>(query: SQL) => execute<T>(query),
    atomicAll: <T = Record<string, unknown>>(query: SQL, lock: string) => execute<T>(query, lock),
    run: (query: SQL) => postgres ? execute(query) : adapter.drizzle.run(query),
    hour: (column: SQL) => postgres
      ? sql`to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:00:00"Z"')`
      : sql`strftime('%Y-%m-%dT%H:00:00Z',${column})`,
    contains: (column: SQL, value: string) => postgres
      ? sql`strpos(lower(${column}), lower(${value})) > 0`
      : sql`instr(lower(${column}), lower(${value})) > 0`,
  }
}
