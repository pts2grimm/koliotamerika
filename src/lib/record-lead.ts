import type { Payload } from 'payload'
import { siteURL } from './data'
import { integrationSecrets } from './integration-secrets'
import { sendMetaLead, type LeadInput } from './meta-capi'
import { isPreview } from './preview'

export async function recordLead(payload: Payload, request: Request, lead: LeadInput) {
  try {
    const config = await payload.findGlobal({ slug: 'integrations', depth: 0, context: { integrationSecrets } })
    const result = await sendMetaLead({ config, request, lead, origin: siteURL(), preview: isPreview() })
    if (result === 'failed') payload.logger.warn('[integrations] Meta CAPI delivery failed; the inquiry is saved. Check token and Test Events.')
  } catch { payload.logger.warn('[integrations] Meta CAPI unavailable; the inquiry is saved.') }
}
