import type { PoolConfig } from 'pg'
import { supabaseCA } from './supabase-ca'
export function postgresPool(env: NodeJS.ProcessEnv = process.env): PoolConfig {
  if (!env.DATABASE_URI) throw new Error('DATABASE_URI is required for PostgreSQL')
  const url = new URL(env.DATABASE_URI)
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('PostgreSQL requires a PostgreSQL connection URL')
  for (const name of ['sslmode','sslcert','sslkey','sslrootcert']) url.searchParams.delete(name)
  const localCI = env.CI === 'true' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname)
  const ca = env.DATABASE_CA_CERT || supabaseCA
  if (!localCI && !ca) throw new Error('A trusted PostgreSQL CA certificate is required')
  return {
    connectionString: url.toString(), max: 5, connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000, statement_timeout: 15000,
    ssl: localCI ? false : { rejectUnauthorized: true, ca },
    application_name: 'koliotamerika',
  }
}
