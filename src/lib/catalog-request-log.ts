import 'server-only'
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
export function observeCatalogRequest<T>(input: CatalogRequestInput, run: () => Promise<T>, describe: (result:T) => CatalogRequestSummary) {
  return runCatalogRequest(input, run, describe, schedule)
}
