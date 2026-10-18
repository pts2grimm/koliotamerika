import 'server-only'
import { unstable_rethrow } from 'next/navigation'
import { headers } from 'next/headers'
import { catalogueRequestIP } from './catalog-request-ip'
import { after } from 'next/server'
import { isPreview } from './preview'
import { runCatalogRequest, type CatalogRequestInput, type CatalogRequestSummary, type CatalogRequestRecord } from './catalog-requests'
let lastWarning = 0
function warn() {
  if (Date.now()-lastWarning > 60000) { lastWarning=Date.now(); console.warn('Catalogue request log unavailable or full') }
}
function schedule(data: CatalogRequestRecord) {
  if (isPreview()) return
  try {
    after(async () => {
      try {
        const [{ getPayload }, { default: config }, { insertCatalogRequest }] = await Promise.all([
          import('payload'), import('../payload.config'), import('./catalog-requests-server'),
        ])
        if (!await insertCatalogRequest(await getPayload({config}), data)) warn()
      } catch { warn() } // No request parameters, customer data, credentials or provider bodies in logs.
    })
  } catch { warn() } // Scripts outside a Next request do not produce untracked background promises.
}
export async function observeCatalogRequest<T>(input: CatalogRequestInput, run: () => Promise<T>, describe: (result:T) => CatalogRequestSummary) {
  // Resolve per-request data OUTSIDE provider caches and before scheduling after().
  // Never read cookies, authorization, user-agent or the full headers object into the log.
  let requestIP
  if (!isPreview() && process.env.TRUST_PROXY === 'true') {
    try { requestIP=catalogueRequestIP(await headers(), true) } catch (error) { unstable_rethrow(error) /* No request context: no IP. */ }
  }
  return runCatalogRequest({...input,requestIP}, run, describe, schedule)
}
