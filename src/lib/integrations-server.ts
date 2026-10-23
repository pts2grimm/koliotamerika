import { publicIntegrationSelect } from './list-projections'
import { cache } from 'react'
import { cms, siteURL } from './data'
import { isPreview } from './preview'
import { publicIntegrations } from './integration-config'

export const integrationSettings = cache(async () => {
  try { return await (await cms()).findGlobal({ slug: 'integrations', depth: 0, select: publicIntegrationSelect }) }
  catch { return null } // Optional analytics must never take the site down.
})
export const publicIntegrationSettings = cache(async () => publicIntegrations(await integrationSettings() || {}, siteURL(), isPreview()))
