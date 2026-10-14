import { smtpFailureReason } from './smtp-config'

export type InquiryNotification = {
 id: string | number; name: string; email: string; phone: string;
 message: string; car?: string | null; budget?: string | null
}
type Mail = { to: string; replyTo: { address: string; name: string }; subject: string; text: string }
type Delivery = {
 enabled: boolean; siteURL: string;
 getRecipient: () => Promise<string | null | undefined>;
 send: (mail: Mail) => Promise<unknown>;
 warn: (message: string) => void;
 info?: (message: string) => void;
}

/** The saved inquiry remains the source of truth; email is a best-effort notification. */
export async function notifyInquiry(inquiry: InquiryNotification, delivery: Delivery): Promise<boolean> {
 if (!delivery.enabled) {
  delivery.warn('Inquiry notification skipped: SMTP_HOST or SMTP_FROM is missing at runtime.')
  return false
 }
 delivery.info?.('Inquiry notification started.')
 try {
  const to = (await delivery.getRecipient())?.trim()
  if (!to || !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(to)) {
   delivery.warn('Inquiry notification skipped: configure the site contact email.')
   return false
  }
  const result = await delivery.send({
   to, replyTo: { address: inquiry.email, name: inquiry.name },
   subject: 'Ново запитване от Коли от Америка',
   text: [
    'Получено е ново запитване. То е записано и в администрацията.',
    '', 'Име: ' + inquiry.name, 'Имейл: ' + inquiry.email, 'Телефон: ' + inquiry.phone,
    'Автомобил: ' + (inquiry.car || 'Не е посочен'), 'Бюджет: ' + (inquiry.budget || 'Не е посочен'),
    '', 'Съобщение:', inquiry.message, '',
    new URL('/admin/collections/inquiries/' + encodeURIComponent(String(inquiry.id)), delivery.siteURL).href,
   ].join('\n'),
  })
  // Nodemailer reports acceptance by SMTP, not final inbox delivery.
  const accepted = result && typeof result === 'object' && 'accepted' in result ? (result as { accepted?: unknown }).accepted : undefined
  if (Array.isArray(accepted) && accepted.length === 0) {
   delivery.warn('Inquiry notification failed: recipient_rejected; the saved inquiry is available in the admin panel.')
   return false
  }
  delivery.info?.(Array.isArray(accepted) ? 'Inquiry notification accepted by SMTP; inbox delivery is not confirmed.' : 'Inquiry notification transport completed; inbox delivery is not confirmed.')
  return true
 } catch (error) {
  // Never log contact details, message bodies, SMTP credentials or transport errors.
  delivery.warn('Inquiry notification failed: ' + smtpFailureReason(error) + '; the saved inquiry is available in the admin panel.')
  return false
 }
}


/**
 * Start the notification while the request is alive. Bound the visitor's wait.
 * A deadline is NOT proof of failure: an in-flight SMTP transaction may finish
 * later. Do not retry it automatically (that could deliver duplicate emails).
 */
export async function notifyInquiryBeforeResponse(inquiry: InquiryNotification, delivery: Delivery, timeoutMs = 12000): Promise<boolean> {
 let expired = false
 let timer: ReturnType<typeof setTimeout> | undefined
 const deadline = new Promise<boolean>(resolve => {
  timer = setTimeout(() => {
   expired = true
   delivery.warn('Inquiry notification wait_timeout; final SMTP outcome is unknown, inquiry remains saved.')
   resolve(false)
  }, timeoutMs)
 })
 const work = notifyInquiry(inquiry, { ...delivery, send: mail => {
  // A slow recipient lookup must not start a new send after the deadline.
  if (expired) throw Object.assign(new Error('Notification wait expired'), { code: 'ETIMEDOUT' })
  return delivery.send(mail)
 } })
 try { return await Promise.race([work, deadline]) }
 finally { if (timer) clearTimeout(timer) }
}
