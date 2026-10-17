import { randomUUID } from 'node:crypto'
import { APIError, type CollectionConfig, type Field, type Access } from 'payload'
import { bosAmounts, bosToday, validBosDate, validBosMoney } from '../lib/bos'

const staff: Access = ({ req }) => req.user?.collection === 'users'
const text = (name: string, label: string, required = false, maxLength = 80): Field => ({
  name, label, type: 'text', required, maxLength,
  validate: (value: unknown) => value == null || value === '' ? (required ? 'Полето е задължително.' : true)
    : typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength && !/[\u0000-\u001f\u007f]/.test(value) ? true : 'Въведи текст без управляващи символи.',
})
const date = (name: string, label: string, required = false): Field => ({
  name, label, type: 'text', required,
  admin: { placeholder: 'YYYY-MM-DD', description: 'Формат: 2026-10-17.' },
  validate: (v: unknown) => !required && !v || validBosDate(v) ? true : 'Въведи валидна дата във формат YYYY-MM-DD.',
})
const money = (name: string, label: string, defaultValue?: number): Field => ({
  name, label, type: 'number', required: true, min: 0, max: 99999999.99, defaultValue,
  validate: (v: unknown) => validBosMoney(v) ? true : 'Невалидна сума: максимум два знака след десетичната запетая.',
})

export const BillsOfSale: CollectionConfig = {
  slug: 'bills-of-sale',
  typescript: { interface: 'BillOfSale' },
  labels: { singular: 'BOS документ', plural: 'BOS документи' },
  lockDocuments: false,
  admin: {
    group: 'Документи', useAsTitle: 'stock',
    defaultColumns: ['stock', 'saleDate', 'buyerName', 'vin', 'make', 'model', 'total', 'balance'],
    listSearchableFields: ['stock', 'vin', 'buyerName', 'make', 'model'],
    description: 'Bill of Sale за закупен автомобил. Всички суми са в USD. Запази документа преди изтегляне на PDF. Подписът на продавача се добавя автоматично. Купувачът подписва отделно.',
    components: { edit: { beforeDocumentControls: ['/src/components/admin/BosControls#BosDownload'] } },
  },
  access: { create: staff, read: staff, update: staff, delete: staff },
  hooks: {
    beforeValidate: [({ data, originalDoc, operation }) => {
      if (!data) return data
      data.stock = operation === 'create' ? 'X' + randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase() : originalDoc?.stock
      if (typeof data.vin === 'string') data.vin = data.vin.trim().toUpperCase()
      const values = { ...originalDoc, ...data }
      if ([values.vehiclePrice, values.shipping, values.paidAmount].every(v => v != null)) {
        try { Object.assign(data, bosAmounts(values.vehiclePrice, values.shipping, values.paidAmount)) }
        catch (error) { throw new APIError((error as Error).message, 400) }
      }
      return data
    }],
  },
  fields: [
    { name: 'stock', label: 'Stock (автоматично)', type: 'text', required: true, unique: true, admin: { readOnly: true, position: 'sidebar', description: 'Постоянен номер; генерира се при първия запис.' } },
    { ...date('saleDate', 'Дата на продажбата', true), defaultValue: () => bosToday(), admin: { position: 'sidebar', placeholder: 'YYYY-MM-DD' } } as Field,
    { type: 'tabs', tabs: [
      { label: 'Купувач', fields: [
        { name: 'buyerPicker', type: 'ui', admin: { components: { Field: '/src/components/admin/BosBuyerFields#BosBuyerPicker' } } },
        text('buyerName', 'Име / фирма на купувача', true, 100),
        text('buyerAddress', 'Улица и номер', true, 140),
        { ...text('buyerCity', 'Град', true, 60), admin: { components: { Field: '/src/components/admin/BosBuyerFields#BosCityField' } } } as Field,
        { type: 'row', fields: [text('buyerPostalCode', 'Пощенски код', true, 20), text('buyerCountry', 'Държава', true, 50)] },
        { type: 'row', fields: [text('buyerPhone', 'Мобилен телефон', false, 30), text('buyerHomePhone', 'Домашен телефон', false, 30), text('buyerWorkPhone', 'Служебен телефон', false, 30)] },
        { type: 'row', fields: [text('buyerState', 'Щат / област', false, 30), text('buyerCounty', 'Окръг (County)', false, 30)] },
        { type: 'row', fields: [text('buyerLicense', 'D.L. / State ID (по избор)', false, 40), date('buyerDOB', 'Дата на раждане (по избор)'), date('buyerLicenseExpiry', 'Валидност на документа (по избор)')] },
      ] },
      { label: 'Автомобил', fields: [
        { name: 'vin', label: 'VIN', type: 'text', required: true, index: true, maxLength: 17,
          validate: (v: unknown) => typeof v === 'string' && /^[A-HJ-NPR-Z0-9]{17}$/.test(v) ? true : 'VIN трябва да съдържа 17 букви и цифри, без I, O и Q.' },
        { type: 'row', fields: [text('make', 'Make / Марка', true, 40), text('model', 'Model / Модел', true, 60)] },
        { type: 'row', fields: [
          { name: 'year', label: 'Year / Година', type: 'number', required: true, min: 1900, max: 2100,
            validate: (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v >= 1900 && v <= 2100 ? true : 'Въведи валидна година.' },
          text('body', 'Body / Каросерия', true, 30), text('cylinders', 'Cyl / Цилиндри', true, 15),
        ] },
        { type: 'row', fields: [text('color1', 'Color 1 / Цвят', false, 30), text('color2', 'Color 2 / Втори цвят', false, 30)] },
        { type: 'row', fields: [text('style', 'Style / Версия', false, 40), text('transmission', 'Trans / Скоростна кутия', false, 30)] },
        { name: 'mileage', label: 'Mileage / Пробег (мили)', type: 'number', min: 0, max: 9999999,
          validate: (v: unknown) => v == null || typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 9999999 ? true : 'Въведи пробег в цели мили.' },
      ] },
      { label: 'Суми и бележки', fields: [
        { type: 'row', fields: [money('vehiclePrice', 'Vehicle price ($)'), money('shipping', 'Shipping to Rotterdam ($)', 0), money('paidAmount', 'Платена сума ($)', 0)] },
        { name: 'summary', type: 'ui', admin: { components: { Field: '/src/components/admin/BosControls#BosSettlement' } } },
        { type: 'row', fields: [
          { name: 'total', label: 'Общо ($)', type: 'number', admin: { readOnly: true } },
          { name: 'balance', label: 'Остатък ($)', type: 'number', admin: { readOnly: true } },
        ] },
        { name: 'remarks', label: 'Remarks / Бележки в PDF', type: 'textarea', maxLength: 350 },
      ] },
      { label: 'Продавач', fields: [
        { name: 'sellerInformation', type: 'ui', admin: { components: { Field: '/src/components/admin/BosControls#BosSeller' } } },
      ] },
    ] },
  ],
}
