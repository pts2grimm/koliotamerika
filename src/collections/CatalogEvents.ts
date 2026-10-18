import type { CollectionConfig, Field } from 'payload'
const text = (name: string, label: string, index = false): Field => ({ name, label, type: 'text', index, admin: { readOnly: true } })
export const CatalogEvents: CollectionConfig = {
  slug: 'catalog-events',
  labels: { singular: 'Действие в каталога', plural: 'Активност в каталога' },
  lockDocuments: false,
  admin: { hidden: true, useAsTitle: 'make', defaultColumns: ['kind','make','model','lot','createdAt'] },
  access: { create: () => false, update: () => false, read: ({ req }) => req.user?.collection === 'users', delete: ({ req }) => req.user?.collection === 'users' },
  fields: [
    { name: 'event', type: 'text', required: true, unique: true, admin: { readOnly: true } },
    text('subject', 'Браузърна сесия', true),
    { name: 'customer', type: 'relationship', relationTo: 'customers', index: true, admin: { readOnly: true }, label: 'Влязъл клиент' },
    { name: 'kind', type: 'select', required: true, index: true, options: [{ value: 'search', label: 'Търсене' }, { value: 'view', label: 'Отворен автомобил' }], admin: { readOnly: true } },
    { name: 'section', type: 'select', required: true, options: [{ value: 'cars', label: 'Коли' }, { value: 'powersports', label: 'Мотори и ATV' }], admin: { readOnly: true } },
    { name: 'archive', type: 'checkbox', admin: { readOnly: true }, label: 'Архив' },
    text('make', 'Марка', true), text('model', 'Модел'), text('yearFrom', 'Година от'), text('yearTo', 'Година до'),
    text('lot', 'Лот', true), text('site', 'Аукцион'), text('vin', 'VIN'), text('query', 'Търсене по лот / VIN'),
    { name: 'resultCount', type: 'number', admin: { readOnly: true }, label: 'Брой резултати' },
    { name: 'outcome', type: 'select', options: [{ value: 'results', label: 'Има резултати' }, { value: 'empty', label: 'Без резултати' }, { value: 'error', label: 'Неуспешно зареждане' }], admin: { readOnly: true } },
    { name: 'filters', type: 'json', admin: { readOnly: true }, label: 'Филтри' },
  ],
}
