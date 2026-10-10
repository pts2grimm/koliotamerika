import type { Access, CollectionConfig } from 'payload'
const staff: Access = ({ req }) => req.user?.collection === 'users'
const blocked = () => Response.json({ error: 'Използвайте страницата за клиентски вход.' }, { status: 403 })
export const Customers: CollectionConfig = {
 slug: 'customers', labels: { singular: 'Клиент', plural: 'Клиенти' }, admin: { useAsTitle: 'email', defaultColumns: ['name', 'email', 'phone', 'createdAt'] },
 auth: {
  maxLoginAttempts: 5, lockTime: 600000, tokenExpiration: 60 * 60 * 24 * 7, useSessions: true,
  forgotPassword: { expiration: 3600000, generateEmailSubject: () => 'Нова парола — Коли от Америка', generateEmailHTML: args => {
   const url = new URL('/nova-parola', process.env.NEXT_PUBLIC_SERVER_URL)
   url.searchParams.set('token', args?.token || '')
   return `<h1>Нова парола</h1><p>Използвай връзката до 1 час:</p><p><a href="${url.toString().replace(/&/g, '&amp;')}">Избери нова парола</a></p><p>Ако не си поискал промяната, игнорирай това писмо.</p>`
  } },
 },
 hooks: { beforeDelete: [async ({ id, req }) => { await req.payload.delete({ collection: 'saved-vehicles', where: { customer: { equals: id } }, req }) }] },
 access: { unlock: staff, admin: () => false, create: staff, read: staff, update: staff, delete: staff },
 endpoints: ['/first-register', '/login', '/forgot-password', '/reset-password', '/refresh-token', '/verify/:id'].map(path => ({ path, method: 'post', handler: blocked })),
 fields: [
  { name: 'name', label: 'Име', type: 'text', required: true, maxLength: 120 },
  { name: 'phone', label: 'Телефон', type: 'text', maxLength: 40 },
  { name: 'consentedAt', label: 'Приета политика за поверителност', type: 'date', required: true, admin: { readOnly: true } },
 ],
}
export const SavedVehicles: CollectionConfig = {
 slug: 'saved-vehicles', labels: { singular: 'Запазен автомобил', plural: 'Запазени автомобили' }, admin: { useAsTitle: 'title' },
 access: { create: () => false, read: staff, update: () => false, delete: staff },
 fields: [
  { name: 'customer', type: 'relationship', relationTo: 'customers', required: true, index: true },
  { name: 'key', type: 'text', unique: true, required: true },
  { name: 'kind', type: 'select', options: ['auction', 'car'], required: true },
  { name: 'title', label: 'Автомобил', type: 'text', required: true, maxLength: 200 },
  { name: 'lot', type: 'text' }, { name: 'site', type: 'text' }, { name: 'slug', type: 'text' },
 ],
}
