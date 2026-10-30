import type { Payload } from 'payload'
import { validPassword } from './password-policy'
import { seed } from './seed'

/** Called only after all schema migrations have completed. */
export async function initializeContent(payload: Payload, options: { preview: boolean; importLegacy: boolean }) {
  payload.logger.info('[bootstrap] Schema ready; initializing content.')
  if (!options.preview && process.env.INITIAL_ADMIN_EMAIL && process.env.INITIAL_ADMIN_PASSWORD &&
      !(await payload.count({ collection: 'users' })).totalDocs) {
    if (!validPassword(process.env.INITIAL_ADMIN_PASSWORD)) {
      throw new Error('INITIAL_ADMIN_PASSWORD must have between 8 and 128 characters.')
    }
    await payload.create({
      collection: 'users',
      data: { email: process.env.INITIAL_ADMIN_EMAIL, password: process.env.INITIAL_ADMIN_PASSWORD, name: 'Администратор' },
    })
  }
  await seed(payload)
  if (options.importLegacy) {
    payload.logger.info('[bootstrap] Importing missing legacy content.')
    const { importContent } = await import('./import-content')
    const imported = await importContent(payload)
    payload.logger.info(`[bootstrap] Imported ${imported} missing pages/articles.`)
    const { importEditorialDrafts } = await import('./import-editorial-drafts')
    await importEditorialDrafts(payload)
    try {
      const { restoreCleanTitlePublication } = await import('./restore-clean-title-publication')
      if (await restoreCleanTitlePublication(payload)) payload.logger.info('[bootstrap] Restored original Clean Title publication date.')
    } catch (error) {
      payload.logger.warn({ err: error }, '[bootstrap] Clean Title publication restoration deferred; existing content preserved.')
    }
    try {
      const { scheduleEditorialArticles } = await import('./schedule-editorial')
      const scheduled = await scheduleEditorialArticles(payload)
      if (scheduled) payload.logger.info(`[bootstrap] Scheduled ${scheduled} approved editorial articles.`)
    } catch (error) {
      payload.logger.warn({ err: error }, '[bootstrap] Editorial scheduling deferred; existing content preserved.')
    }
    // Editorial upgrades must never prevent the site from starting. Transactions
    // leave failed pages unchanged and the next initialization can retry them.
    try {
      const { upgradePageSEO } = await import('./page-seo-upgrade')
      const updated = await upgradePageSEO(payload)
      if (updated) payload.logger.info(`[bootstrap] Updated SEO on ${updated} untouched legacy pages.`)
    } catch (error) {
      payload.logger.warn({ err: error }, '[bootstrap] Page SEO upgrade deferred; existing content preserved.')
    }
  }
  if (options.importLegacy) {
    try {
      const { upgradeContentReview } = await import('./content-review-upgrade')
      const updated = await upgradeContentReview(payload)
      if (updated) payload.logger.info(`[bootstrap] Reviewed content and links on ${updated} legacy pages/articles.`)
    } catch (error) {
      payload.logger.warn({ err: error }, '[bootstrap] Content review deferred; existing content preserved.')
    }
  }
  if (options.importLegacy) {
    try {
      const { upgradePricingDetails } = await import('./pricing-details-upgrade')
      const updated = await upgradePricingDetails(payload)
      if (updated) payload.logger.info(`[bootstrap] Restored pricing details on ${updated} pages/articles.`)
    } catch (error) {
      payload.logger.warn({ err: error }, '[bootstrap] Pricing details deferred; existing content preserved.')
    }
  }
  if (options.importLegacy) {
    try {
      const { upgradePlainLanguage } = await import('./plain-language-upgrade')
      const updated = await upgradePlainLanguage(payload)
      if (updated) payload.logger.info(`[bootstrap] Simplified language on ${updated} pages.`)
    } catch (error) {
      payload.logger.warn({ err: error }, '[bootstrap] Plain language update deferred; existing content preserved.')
    }
  }
  if (options.importLegacy) {
    try {
      const { upgradeCustomerPricing } = await import('./customer-pricing-upgrade')
      const updated = await upgradeCustomerPricing(payload)
      if (updated) payload.logger.info(`[bootstrap] Updated customer pricing on ${updated} pages.`)
    } catch (error) {
      payload.logger.warn({ err: error }, '[bootstrap] Customer pricing update deferred; existing content preserved.')
    }
  }
  if (options.importLegacy) {
    try {
      const { upgradeServicesReview } = await import('./services-review-upgrade')
      const updated = await upgradeServicesReview(payload)
      if (updated) payload.logger.info(`[bootstrap] Reviewed service content on ${updated} pages.`)
    } catch (error) {
      payload.logger.warn({ err: error }, '[bootstrap] Services review deferred; existing content preserved.')
    }
  }
  if (options.importLegacy) {
    try {
      const { upgradeGalleryReview } = await import('./gallery-review-upgrade')
      const updated = await upgradeGalleryReview(payload)
      if (updated) payload.logger.info('[bootstrap] Restored gallery presentation.')
    } catch (error) {
      payload.logger.warn({ err: error }, '[bootstrap] Gallery review deferred; existing content preserved.')
    }
  }
  if(options.importLegacy) {
    try {
      const { upgradeClarity } = await import('./clarity-upgrade')
      const updated=await upgradeClarity(payload)
      if(updated)payload.logger.info(`[bootstrap] Clarified customer terms on ${updated} pages.`)
    } catch(error) {
      payload.logger.warn({err:error},'[bootstrap] Clarity update deferred; existing content preserved.')
    }
  }
  if(options.importLegacy) {
    try {
      const { upgradeHomologation } = await import('./homologation-upgrade')
      const updated = await upgradeHomologation(payload)
      if(updated)payload.logger.info(`[bootstrap] Updated homologation terminology on ${updated} pages.`)
    } catch(error) {
      payload.logger.warn({err:error},'[bootstrap] Homologation update deferred; transaction rolled back.')
    }
  }
  try {
    const { upgradeCalculatorDelivery } = await import('./calculator-upgrade')
    await upgradeCalculatorDelivery(payload)
  } catch (error) {
    payload.logger.warn({ err: error }, '[bootstrap] Calculator delivery update deferred; existing settings preserved.')
  }
  try {
    const { upgradeContactPhone } = await import('./contact-phone-upgrade')
    const updated = await upgradeContactPhone(payload)
    if (updated) payload.logger.info(`[bootstrap] Corrected the business contact phone in ${updated} records.`)
  } catch (error) {
    payload.logger.warn({ err: error }, '[bootstrap] Contact phone correction deferred; transaction rolled back.')
  }
  payload.logger.info('[bootstrap] Ready.')
}
