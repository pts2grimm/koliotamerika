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
}

/** The saved inquiry remains the source of truth; email is a best-effort notification. */
export async function notifyInquiry(inquiry: InquiryNotification, delivery: Delivery): Promise<boolean> {
 if (!delivery.enabled) return false
 try {
  const to = (await delivery.getRecipient())?.trim()
  if (!to || !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(to)) {
   delivery.warn('Inquiry notification skipped: configure the site contact email.')
   return false
  }
  await delivery.send({
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
  return true
 } catch {
  // Never log contact details, message bodies, SMTP credentials or transport errors.
  delivery.warn('Inquiry notification failed; the saved inquiry is available in the admin panel.')
  return false
 }
}
