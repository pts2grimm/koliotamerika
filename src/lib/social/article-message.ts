type Article = { title: string; intro?: string | null; slug: string }

const hooks: [RegExp, string][] = [
 [/manheim|cox automotive|индекс|автомобилен пазар|пазарът/iu, '📊 Какво означават пазарните числа за твоята следваща кола?'],
 [/offsite|sublot|място.*получаване/iu, '📍 Избра колата. А откъде точно ще я вземе превозвачът?'],
 [/пробег|километраж|odometer/iu, '🧐 Видя километража. А прочете ли как е описан пробегът?'],
 [/липсващ ключ|без ключ/iu, '🔑 Хареса си кола без ключ? Има какво да уточниш преди наддаването.'],
 [/документ|bill of sale|title|тежести|lien/iu, '📄 Снимките привличат вниманието. Документите също заслужават поглед.'],
 [/транспорт|доставка|превоз|товарене/iu, '🚢 От търга до България — какво да уточниш по пътя?'],
 [/бюджет|разход|такси|цена|цените/iu, '🧮 Какво влиза в сметката за избраната кола?'],
 [/зареждане|заряд|електромобил/iu, '🔌 Електромобил от САЩ? Провери детайлите преди покупката.'],
]
const openings = [
 '🚘 Планираш покупка от САЩ или Канада? Отдели минута за тази тема.',
 '🔎 Преди следващия търг: една тема, която си струва да разгледаш.',
 '💡 Въпросите преди покупката са важни. Ето още една тема за твоя списък.',
]
const endings = [
 '👇 Виж подробностите в статията.',
 '👇 Отвори статията и запази линка за следващия си избор.',
 '👇 Прочети повече в блога на Коли от Америка.',
]
function variant(slug: string, count: number) {
 return Array.from(slug).reduce((sum, char) => (sum + char.codePointAt(0)!) % count, 0)
}
const clean = (value: string) => value.replace(/\s+/gu, ' ').trim()
// Change presentation only: keep dates, figures and qualifications from the CMS.
// Sentence breaks do not split decimal numbers or remove any source sentence.
function paragraphs(value: string) {
 return clean(value).split(/(?<=[!?])\s+|(?<=\.)\s+(?=[А-ЯA-Z])/u).join('\n\n')
}
export function articlePostMessage(article: Article): string {
 const originalTitle = clean(article.title)
 const title = originalTitle.length <= 500 ? originalTitle : 'От блога на Коли от Америка'
 const opening = hooks.find(([pattern]) => pattern.test(originalTitle))?.[1]
  || openings[variant(article.slug, openings.length)]
 const ending = endings[variant(article.slug, endings.length)]
 const intro = paragraphs(article.intro || '')
 const full = [opening, title, intro, ending].filter(Boolean).join('\n\n')
 // Never cut off an exception, date or negation to fit the editor's 2,000-character limit.
 // For an unusually long intro, link to the full article without quoting an incomplete excerpt.
 return full.length <= 2000 ? full : [opening, title, ending].join('\n\n')
}
