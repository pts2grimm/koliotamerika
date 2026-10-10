import type { GlobalConfig } from 'payload'
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings', label: 'Настройки на сайта', access: { read: () => true, update: ({ req }) => Boolean(req.user) },
  fields: [
    { name: 'brand', label: 'Име на бизнеса', type: 'text', defaultValue: 'Коли от Америка', required: true },
    { name: 'phone', label: 'Телефон', type: 'text' }, { name: 'email', label: 'Имейл за контакт', type: 'email' },
    { name: 'viberURL', label: 'Viber група', type: 'text' },
    { name: 'facebookURL', label: 'Facebook', type: 'text' },
    { name: 'workingHours', label: 'Работно време', type: 'text' },
    { name: 'address', label: 'Адрес', type: 'textarea' },
    { name: 'heroTitle', label: 'Главно заглавие', type: 'text', defaultValue: 'Следващата ти кола.\nОт другата страна на океана.' },
    { name: 'heroDescription', label: 'Текст на началната страница', type: 'textarea', defaultValue: 'Открий възможностите за внос на автомобил от САЩ и Канада. От първия избор до пристигането в България — започваме с твоите изисквания.' },
    { name: 'heroImage', label: 'Главна снимка', type: 'upload', relationTo: 'media' },
    { name: 'defaultDescription', label: 'Основно SEO описание', type: 'textarea', defaultValue: 'Автомобили от САЩ и Канада. Разгледайте процеса на внос, изберете автомобил и изпратете запитване до Коли от Америка.' },
    { name: 'faq', label: 'Често задавани въпроси', type: 'array', fields: [{ name: 'question', label: 'Въпрос', type: 'text', required: true }, { name: 'answer', label: 'Отговор', type: 'textarea', required: true }] }
  ]
}
