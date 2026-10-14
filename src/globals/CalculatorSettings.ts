import type { GlobalConfig } from 'payload'
export const defaultTiers = [
 { from: 0, fee: 600, percent: 0, extra: 1800 }, { from: 1000, fee: 800, percent: 0, extra: 1800 },
 { from: 2000, fee: 1000, percent: 0, extra: 2000 }, { from: 3000, fee: 1200, percent: 0, extra: 2100 },
 { from: 5000, fee: 1400, percent: 0, extra: 2200 }, { from: 8000, fee: 1400, percent: 0, extra: 2400 },
 { from: 10000, fee: 1500, percent: 0, extra: 3500 }, { from: 15000, fee: 0, percent: 12.5, extra: 5000 },
 { from: 20000, fee: 0, percent: 12.5, extra: 7000 }, { from: 25000, fee: 0, percent: 12.5, extra: 10000 }
]
export const CalculatorSettings: GlobalConfig = { slug: 'calculator-settings', label: 'Калкулатор за внос', admin: { description: 'Примерни разходи, а не текуща оферта. Таксите на аукциона следват зададената таблица; комисионната е €1000. Мито 10% и ДДС 20% са допусканията от публикувания пример. Старите BGN настройки се пазят в архивните секции.' }, access: { read: () => true, update: ({ req }) => req.user?.collection === 'users' }, fields: [
 {name:'usdToEur',label:'Примерен курс: 1 USD в EUR',type:'number',required:true,defaultValue:0.9,min:0.01,max:10},
 {name:'shippingUsd',label:'Начален морски транспорт (USD)',type:'number',required:true,defaultValue:1000,min:0,max:100000},
 {name:'insuranceUsd',label:'Примерна застраховка (USD)',type:'number',required:true,defaultValue:200,min:0,max:100000},
 {name:'portHandlingEur',label:'Примерна обработка в пристанището (EUR)',type:'number',required:true,defaultValue:300,min:0,max:100000},
 {name:'deliveryEur',label:'Примерна доставка до България (EUR)',type:'number',required:true,defaultValue:1000,min:0,max:100000},
 { type:'collapsible', label:'Архив на предишния калкулатор (не участва в новата сметка)', admin:{initCollapsed:true}, fields:[
 {name:'documentUsd',label:'Изпращане на документ (USD) — не участва в сметката',type:'number',required:true,defaultValue:20,min:0,max:100000},
 { name: 'usdToBgn', label: 'Коефициент USD → BGN от текущата тарифа', type: 'number', required: true, min: 0.01, defaultValue: 1.7, admin: { description: 'Пренесен от WordPress. Не е автоматичен валутен курс.' } },
 { name: 'fixedCosts', label: 'Фиксирани допълнителни разходи (BGN)', type: 'number', required: true, min: 0, defaultValue: 4100 },
 ] },
 { name: 'defaultInland', label: 'Начална стойност за вътрешен транспорт (USD)', type: 'number', min: 0, defaultValue: 500 },
 { type:'collapsible',label:'Архив на предишните диапазони',admin:{initCollapsed:true},fields:[
 { name: 'defaultShipping', label: 'Начална стойност за контейнер (USD)', type: 'number', min: 0, defaultValue: 800 },
 { name: 'tiers', label: 'Ценови диапазони', type: 'array', required: true, minRows: 1, defaultValue: defaultTiers, fields: [
  { name: 'from', label: 'Цена на търг от (USD)', type: 'number', required: true, min: 0 },
  { name: 'fee', label: 'Фиксирана такса (USD)', type: 'number', required: true, min: 0 },
  { name: 'percent', label: 'Допълнителна такса (%)', type: 'number', required: true, min: 0, max: 100 },
  { name: 'extra', label: 'Допълнителни разходи за диапазона (BGN)', type: 'number', required: true, min: 0 }
 ] },
] },
 { name: 'note', label: 'Уточнение за клиента', type: 'textarea', defaultValue: 'Ориентировъчна сметка по тарифата на сайта. Стойностите за транспорт са примерни, а коефициентът за валутата не е курс в реално време. Ремонт, регистрация и всякакви разходи извън договорената оферта се уточняват индивидуално.' }
] }
