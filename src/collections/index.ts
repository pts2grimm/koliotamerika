import { seoAnalysisFields } from '../fields/seo-analysis'
import { invalidatePublicContent } from '../lib/content-cache-hooks'
import { lexicalEditor, EXPERIMENTAL_TableFeature } from '@payloadcms/richtext-lexical'
import { publishedPages } from '../lib/page-access'
import { enforcePasswordPolicy } from '../lib/password-hook'
import { Forbidden } from 'payload'
import type { Access, CollectionConfig, Field } from 'payload'
import path from 'node:path'
const staff: Access = ({ req }) => req.user?.collection === 'users'
const published: Access = ({ req }) => req.user?.collection === 'users' ? true : { status: { equals: 'published' } }
export const seoFields: Field[] = [...seoAnalysisFields, { name: 'seo', label: 'SEO и споделяне', type: 'group', fields: [
  { name: 'title', label: 'SEO заглавие', type: 'text', maxLength: 70 },
  { name: 'description', label: 'SEO описание', type: 'textarea', maxLength: 180 },
  { name: 'image', label: 'Изображение при споделяне', type: 'upload', relationTo: 'media' },
  { name: 'noIndex', label: 'Скриване от търсачките', type: 'checkbox', defaultValue: false }
] }]
const slug: Field = { name: 'slug', label: 'URL адрес', type: 'text', required: true, unique: true, index: true,
  validate: (value: unknown) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? true : 'Използвайте малки латински букви, цифри и тирета.' }
const status: Field = { name: 'status', label: 'Публикуване', type: 'select', required: true, defaultValue: 'draft', options: [{ label: 'Чернова', value: 'draft' }, { label: 'Публикувано', value: 'published' }], admin: { position: 'sidebar' } }
export const Users: CollectionConfig = { slug: 'users', endpoints: process.env.ALLOW_ADMIN_SETUP !== 'true' ? [{ path: '/first-register', method: 'post', handler: () => Response.json({ error: 'Administrator setup is disabled.' }, { status: 403 }) }] : [], labels: { singular: 'Администратор', plural: 'Администратори' }, auth: { maxLoginAttempts: 5, lockTime: 600000 }, hooks: { beforeOperation: [enforcePasswordPolicy, ({ operation, req }) => { if (operation === 'create' && req.user?.collection === 'customers') throw new Forbidden() }] }, admin: { group: 'Настройки', useAsTitle: 'email' }, access: { unlock: staff, create: staff, read: staff, update: staff, delete: staff }, fields: [{ name: 'name', label: 'Име', type: 'text' }] }
export const Media: CollectionConfig = { slug: 'media', hooks: { afterChange: [invalidatePublicContent], afterDelete: [invalidatePublicContent] }, labels: { singular: 'Снимка', plural: 'Медия' }, access: { read: () => true, create: staff, update: staff, delete: staff }, admin: { group: 'Каталог' }, upload: { staticDir: path.resolve(process.env.MEDIA_DIR || path.join(process.cwd(), 'public/media')), mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'], imageSizes: [{ name: 'card', width: 800, height: 550, fit: 'cover' }], adminThumbnail: 'card' }, fields: [{ name: 'alt', label: 'Описание на изображението (SEO)', type: 'text', required: true }] }
export const Cars: CollectionConfig = { hooks: { afterChange: [invalidatePublicContent], afterDelete: [invalidatePublicContent] }, slug: 'cars', labels: { singular: 'Автомобил', plural: 'Автомобили' }, admin: { group: 'Каталог', useAsTitle: 'title', defaultColumns: ['title', 'price', 'availability', 'status'] }, access: { read: published, create: staff, update: staff, delete: staff }, fields: [
  { name: 'title', label: 'Заглавие', type: 'text', required: true }, slug, status,
  { type: 'row', fields: [{ name: 'make', label: 'Марка', type: 'text', required: true, index: true }, { name: 'model', label: 'Модел', type: 'text', required: true }, { name: 'year', label: 'Година', type: 'number', required: true, min: 1900, max: 2100 }] },
  { type: 'row', fields: [{ name: 'price', label: 'Цена в EUR (по избор)', type: 'number', min: 0 }, { name: 'mileage', label: 'Пробег в км', type: 'number', min: 0 }, { name: 'power', label: 'Мощност в к.с.', type: 'number', min: 1 }] },
  { name: 'fuel', label: 'Гориво', type: 'select', options: ['Бензин', 'Дизел', 'Хибрид', 'Електрически'] },
  { name: 'transmission', label: 'Скоростна кутия', type: 'select', defaultValue: 'Автоматична', options: ['Автоматична', 'Ръчна'] },
  { name: 'availability', label: 'Наличност', type: 'select', defaultValue: 'order', options: [{ label: 'По поръчка', value: 'order' }, { label: 'Наличен', value: 'available' }, { label: 'Продаден', value: 'sold' }] },
  { name: 'image', label: 'Основна снимка', type: 'upload', relationTo: 'media' },
  { name: 'gallery', label: 'Галерия', type: 'array', fields: [{ name: 'image', label: 'Снимка', type: 'upload', relationTo: 'media', required: true }] },
  { name: 'description', label: 'Описание и какво включва цената', type: 'textarea', required: true },
  { name: 'features', label: 'Оборудване', type: 'array', fields: [{ name: 'label', label: 'Екстра', type: 'text', required: true }] }, ...seoFields
] }
export const Pages: CollectionConfig = { slug: 'pages', hooks: { afterChange: [invalidatePublicContent], afterDelete: [invalidatePublicContent] }, labels: { singular: 'Материал', plural: 'Съдържание' }, admin: {
    useAsTitle: 'title',
    group: false,
    defaultColumns: ['title', 'kind', 'status', 'publishedAt'],
    components: {
      views: { list: { Component: '/src/components/admin/ContentList#ContentIndex' } },
      edit: { beforeDocumentControls: ['/src/components/admin/ContentBackLink#ContentBackLink'] },
    },
  }, access: { read: publishedPages, create: staff, update: staff, delete: staff }, fields: [
  { name: 'title', label: 'Заглавие', type: 'text', required: true }, { ...slug, validate: (value: unknown) => typeof value === 'string' && /^[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(value) && !['admin', 'api', 'blog', 'kalkulator', 'targove', 'avtomobili', 'kontakti', 'sitemap', 'robots', 'profil', 'vhod', 'registracia', 'zabravena-parola', 'nova-parola'].includes(value) ? true : 'Невалиден или запазен URL адрес.' }, status,
  { name: 'kind', label: 'Тип', type: 'select', defaultValue: ({ req }) => req?.query?.kind === 'article' ? 'article' : 'page', options: [{ label: 'Страница', value: 'page' }, { label: 'Статия', value: 'article' }] },
  { name: 'eyebrow', label: 'Кратък надпис', type: 'text' },
  { name: 'intro', label: 'Въведение', type: 'textarea', required: true },
  { name: 'image', label: 'Основна снимка', type: 'upload', relationTo: 'media' },
  { name: 'body', label: 'Съдържание', type: 'richText', editor: lexicalEditor({ features: ({ defaultFeatures }) => [...defaultFeatures, EXPERIMENTAL_TableFeature()] }) },
  { name: 'legacyImage', label: 'Пренесена снимка', type: 'text', admin: { readOnly: true, position: 'sidebar' } },
  { name: 'sourceURL', label: 'Източник при миграция', type: 'text', admin: { readOnly: true, position: 'sidebar' } },
  { name: 'publishedAt', label: 'Дата на публикуване', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' }, description: 'За статии: статус „Публикувано“ и бъдеща дата означават отложено публикуване. Проверете часовата зона на избраната дата. Празна дата публикува веднага.' } },
  { name: 'sections', label: 'Секции на страницата', type: 'array', fields: [{ name: 'heading', label: 'Заглавие', type: 'text', required: true }, { name: 'body', label: 'Текст (празен ред за нов абзац)', type: 'textarea', required: true }] }, ...seoFields
] }
export const Inquiries: CollectionConfig = { slug: 'inquiries', labels: { singular: 'Запитване', plural: 'Запитвания' }, admin: { group: 'Клиенти и запитвания', useAsTitle: 'name', defaultColumns: ['name', 'email', 'status', 'createdAt'] }, access: { create: () => false, read: staff, update: staff, delete: staff }, fields: [
  { name: 'customer', label: 'Клиентски профил', type: 'relationship', relationTo: 'customers', index: true, admin: { readOnly: true } },
  { name: 'name', label: 'Име', type: 'text', required: true }, { name: 'email', label: 'Имейл', type: 'email', required: true },
  { name: 'phone', label: 'Телефон', type: 'text', required: true }, { name: 'car', label: 'Желан автомобил', type: 'text' },
  { name: 'budget', label: 'Бюджет', type: 'text' }, { name: 'message', label: 'Съобщение', type: 'textarea', required: true },
  { name: 'consent', label: 'Потвърдена политика за поверителност', type: 'checkbox', required: true },
  { name: 'status', label: 'Статус', type: 'select', defaultValue: 'new', options: [{ label: 'Ново', value: 'new' }, { label: 'В процес', value: 'progress' }, { label: 'Приключено', value: 'done' }] },
  { name: 'notes', label: 'Вътрешни бележки', type: 'textarea' }
] }
export const Redirects: CollectionConfig = { hooks: { afterChange: [invalidatePublicContent], afterDelete: [invalidatePublicContent] }, slug: 'redirects', labels: { singular: 'Пренасочване', plural: 'SEO пренасочвания' }, admin: { group: 'Съдържание и SEO', useAsTitle: 'from' }, access: { create: staff, read: staff, update: staff, delete: staff }, fields: [
  { name: 'from', label: 'Стар път (напр. /old-page)', type: 'text', unique: true, required: true, validate: (v: unknown) => typeof v === 'string' && /^\/(?!\/)[a-zA-Z0-9\-/_%.]+$/.test(v) && !v.startsWith('/api') && !v.startsWith('/admin') ? true : 'Въведете локален път.' },
  { name: 'to', label: 'Нов път (напр. /uslugi)', type: 'text', required: true, validate: (v: unknown) => typeof v === 'string' && /^\/(?!\/)[a-zA-Z0-9\-/_%.]*$/.test(v) ? true : 'Въведете локален път.' }
] }
export const RateLimits: CollectionConfig = { slug: 'submission-limits', admin: { hidden: true }, access: { create: () => false, read: () => false, update: () => false, delete: () => false }, fields: [{ name: 'key', type: 'text', index: true, required: true }] }
export const AuctionQuotes: CollectionConfig = { slug: 'auction-quotes', labels: {singular:'Цена за лот',plural:'Цени до България'}, admin:{group:'Каталог',useAsTitle:'lot',defaultColumns:['lot','site','priceEUR','published']},access:{read:staff,create:staff,update:staff,delete:staff},hooks:{beforeValidate:[({data})=>{if(data)data.key=`${data.provider||'apicar'}:${data.site}:${data.lot}`;return data}]},fields:[
 {name:'provider',label:'Доставчик',type:'select',defaultValue:'apicar',required:true,options:['apicar']},
 {name:'site',label:'Аукцион',type:'select',required:true,options:[{label:'Copart',value:'1'},{label:'IAAI',value:'2'}]},
 {name:'lot',label:'Номер на лот',type:'text',required:true,validate:(v:unknown)=>typeof v==='string'&&/^\d{5,12}$/.test(v)?true:'Невалиден номер на лот.'},
 {name:'key',type:'text',unique:true,admin:{hidden:true}},
 {name:'priceEUR',label:'Ориентировъчна цена до България (EUR)',type:'number',required:true,min:0},
 {name:'published',label:'Покажи цената публично',type:'checkbox',defaultValue:false},
 {name:'notes',label:'Вътрешни бележки (не се показват публично)',type:'textarea'}
]}
