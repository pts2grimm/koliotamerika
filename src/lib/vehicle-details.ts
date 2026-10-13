export type DetailHint = { label: string; text: string; tone: 'good' | 'warn' | 'bad' | 'neutral' }
export function documentHint(value: string): DetailHint {
 const upper = value.toUpperCase()
 const prefix = `Документ: ${value}. `
 if (upper === 'OTHER') return { label: 'Талонът се чака', text: 'Талонът още е в изчакване и не е предаден на аукциона.', tone: 'warn' }
 if (/DESTRUCTION|PARTS ONLY|JUNK|BILL OF SALE|NON.?REPAIRABLE/.test(upper)) return { label: value, text: prefix + 'Този тип документ може да не позволява регистрация в България. Провери конкретния документ с екипа преди участие в търга.', tone: 'bad' }
 if (upper.includes('SALVAGE')) return { label: value, text: prefix + 'Salvage обозначава автомобил, обявен за тотална щета. Възможността за регистрация в България зависи от конкретния документ, ремонта и необходимите процедури.', tone: 'warn' }
 if (/CLEAN|CERTIFICATE OF TITLE|CLEAR/.test(upper)) return { label: value, text: prefix + 'Документ от тип чист талон. Това не удостоверява техническото състояние; преди покупка се проверяват документите и условията за регистрация в България.', tone: 'good' }
 return { label: value, text: prefix + 'Наименование, предоставено от аукциона. Екипът трябва да провери документа и възможността за регистрация преди покупка.', tone: 'neutral' }
}
export function statusHint(value: string): DetailHint {
 const lower = value.toLowerCase()
 if (lower.includes('run') && lower.includes('drive')) return { label: value, text: 'При проверката на аукциона автомобилът е запалил и се е придвижил на собствен ход. Това не е гаранция за техническа изправност или за състоянието му при получаване.', tone: 'good' }
 if (/starts|engine start/.test(lower)) return { label: value, text: 'Двигателят е запалил при проверката на аукциона. Движението на автомобила и работата на скоростната кутия не са потвърдени.', tone: 'warn' }
 if (/enhanced vehicles/.test(lower)) return { label: value, text: 'Това обозначение не потвърждава, че автомобилът пали или се движи. Провери техническото състояние отделно.', tone: 'warn' }
 if (/stationary/.test(lower)) return { label: value, text: 'Автомобилът не е отбелязан като движещ се на собствен ход. Необходима е допълнителна проверка на състоянието.', tone: 'bad' }
 return { label: value, text: 'Статусът е предоставен от аукциона. Ако автомобилът не е тестван, запалването и движението му не са потвърдени.', tone: 'neutral' }
}
export function sellerHint(value: string, source?: 'seller_presence'): DetailHint {
 if (source === 'seller_presence') return { label: value === 'insurance' ? 'Застраховател' : 'Частно лице', text: value === 'insurance' ? 'Категория в нашия каталог за обява с посочено име на продавача. Това не е потвърждение от аукциона, че продавачът е застраховател.' : 'Категория в нашия каталог за обява без посочено име на продавача. Самоличността на продавача се уточнява преди покупка.', tone: value === 'insurance' ? 'good' : 'warn' }
 if (/insurance/i.test(value)) return { label: 'Застраховател', text: 'Автомобилът е обявен от застраховател. Провери историята, щетите и снимките; типът продавач не изключва скрити дефекти.', tone: 'good' }
 if (/dealer|private|individual|person|owner/i.test(value)) return { label: 'Частно лице', text: 'В каталога тази категория включва частни продавачи и дилъри. Провери историята и състоянието, включително за предишни ремонти и неописани дефекти.', tone: 'warn' }
 return { label: value, text: 'Категория на продавача, предоставена от аукциона. Историята и състоянието се проверяват отделно.', tone: 'neutral' }
}
export function mileage(value?: number, unit: 'mi' | 'km' | 'unknown' = 'mi') {
 if (value == null) return undefined
 if (unit === 'unknown') return `${value.toLocaleString('bg-BG')} (мерната единица не е посочена)`
 if (unit === 'km') return `${value.toLocaleString('bg-BG')} km`
 return value == null ? undefined : `${value.toLocaleString('bg-BG')} mi (${Math.round(value * 1.609344).toLocaleString('bg-BG')} km)`
}
