import type { GlobalConfig } from 'payload'
export const defaultTiers = [
 { from: 0, fee: 600, percent: 0, extra: 1800 }, { from: 1000, fee: 800, percent: 0, extra: 1800 },
 { from: 2000, fee: 1000, percent: 0, extra: 2000 }, { from: 3000, fee: 1200, percent: 0, extra: 2100 },
 { from: 5000, fee: 1400, percent: 0, extra: 2200 }, { from: 8000, fee: 1400, percent: 0, extra: 2400 },
 { from: 10000, fee: 1500, percent: 0, extra: 3500 }, { from: 15000, fee: 0, percent: 12.5, extra: 5000 },
 { from: 20000, fee: 0, percent: 12.5, extra: 7000 }, { from: 25000, fee: 0, percent: 12.5, extra: 10000 }
]
export const CalculatorSettings: GlobalConfig = { slug: 'calculator-settings', label: 'Калкулатор за внос', access: { read: () => true, update: ({ req }) => Boolean(req.user) }, fields: [
 { name: 'usdToBgn', label: 'Коефициент USD → BGN от текущата тарифа', type: 'number', required: true, min: 0.01, defaultValue: 1.7, admin: { description: 'Пренесен от WordPress. Не е автоматичен валутен курс.' } },
 { name: 'fixedCosts', label: 'Фиксирани допълнителни разходи (BGN)', type: 'number', required: true, min: 0, defaultValue: 4100 },
 { name: 'defaultInland', label: 'Начална стойност за вътрешен транспорт (USD)', type: 'number', min: 0, defaultValue: 500 },
 { name: 'defaultShipping', label: 'Начална стойност за контейнер (USD)', type: 'number', min: 0, defaultValue: 800 },
 { name: 'tiers', label: 'Ценови диапазони', type: 'array', required: true, minRows: 1, defaultValue: defaultTiers, fields: [
  { name: 'from', label: 'Цена на търг от (USD)', type: 'number', required: true, min: 0 },
  { name: 'fee', label: 'Фиксирана такса (USD)', type: 'number', required: true, min: 0 },
  { name: 'percent', label: 'Допълнителна такса (%)', type: 'number', required: true, min: 0, max: 100 },
  { name: 'extra', label: 'Допълнителни разходи за диапазона (BGN)', type: 'number', required: true, min: 0 }
 ] },
 { name: 'note', label: 'Уточнение за клиента', type: 'textarea', defaultValue: 'Ориентировъчна сметка по тарифата на сайта. Стойностите за транспорт са примерни, а коефициентът за валутата не е курс в реално време. Ремонт, регистрация и всякакви разходи извън договорената оферта се уточняват индивидуално.' }
] }
