import type { CollectionConfig } from 'payload'
import { consentActions, consentActionLabels } from '../lib/consent-audit'

export const ConsentEvents: CollectionConfig = {
  slug: 'consent-events',
  labels: { singular: 'Избор за бисквитки', plural: 'История на съгласията' },
  lockDocuments: false,
  admin: { group: 'Аналитика', useAsTitle: 'subject', defaultColumns: ['subject', 'analytics', 'marketing', 'action', 'createdAt'],
    description: 'Регистър на изричните избори за 180 дни. Идентификаторът означава браузър, не доказана самоличност.' },
  access: { create: () => false, update: () => false, read: ({ req }) => req.user?.collection === 'users', delete: ({ req }) => req.user?.collection === 'users' },
  fields: [
    { name: 'customer', type: 'relationship', relationTo: 'customers', index: true, admin: { readOnly: true }, label: 'Клиент при избора' },
    { name: 'event', type: 'text', required: true, unique: true, admin: { readOnly: true }, label: 'Идентификатор на избора' },
    { name: 'subject', type: 'text', required: true, index: true, admin: { readOnly: true }, label: 'Идентификатор на браузъра' },
    { name: 'analytics', type: 'checkbox', required: true, admin: { readOnly: true }, label: 'Статистика' },
    { name: 'marketing', type: 'checkbox', required: true, admin: { readOnly: true }, label: 'Реклама' },
    { name: 'action', type: 'select', required: true, options: consentActions.map(value => ({ value, label: consentActionLabels[value] })), admin: { readOnly: true }, label: 'Натиснат бутон' },
    { name: 'policyVersion', type: 'text', required: true, admin: { readOnly: true }, label: 'Версия на информацията за бисквитки' },
  ],
}
