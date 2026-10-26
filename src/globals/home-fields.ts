import type { Field } from 'payload'
import { validHomeLink } from '../lib/home-links'
const definitions = [
  {
    "name": "seo",
    "label": "SEO и споделяне",
    "type": "group",
    "fields": [
      {
        "name": "title",
        "label": "SEO заглавие",
        "type": "text",
        "required": true,
        "maxLength": 70
      },
      {
        "name": "description",
        "label": "SEO описание",
        "type": "textarea",
        "required": true,
        "maxLength": 180
      },
      {
        "name": "image",
        "label": "Изображение при споделяне",
        "type": "upload",
        "relationTo": "media"
      },
      {
        "name": "imageAlt",
        "label": "Описание на изображението",
        "type": "text"
      }
    ]
  },
  {
    "name": "hero",
    "label": "Първи екран",
    "type": "group",
    "fields": [
      {
        "name": "eyebrow",
        "label": "Кратък надпис",
        "type": "text"
      },
      {
        "name": "title",
        "label": "Заглавие",
        "type": "textarea",
        "required": true
      },
      {
        "name": "description",
        "label": "Въведение",
        "type": "textarea"
      },
      {
        "name": "image",
        "label": "Главна снимка",
        "type": "upload",
        "relationTo": "media"
      },
      {
        "name": "imagePath",
        "label": "Адрес на съществуваща снимка",
        "type": "text",
        "link": true
      },
      {
        "name": "imageAlt",
        "label": "Описание на снимката",
        "type": "text"
      },
      {
        "name": "note",
        "label": "Бележка под снимката",
        "type": "text"
      },
      {
        "name": "button",
        "label": "Текст на бутона",
        "type": "text"
      },
      {
        "name": "href",
        "label": "Връзка на бутона",
        "type": "text",
        "link": true
      },
      {
        "name": "secondaryButton",
        "label": "Втори бутон",
        "type": "text"
      },
      {
        "name": "secondaryHref",
        "label": "Връзка на втория бутон",
        "type": "text",
        "link": true
      }
    ]
  },
  {
    "name": "search",
    "label": "Търсачка",
    "type": "group",
    "fields": [
      {
        "name": "enabled",
        "label": "Показвай секцията",
        "type": "checkbox",
        "defaultValue": true
      },
      {
        "name": "eyebrow",
        "label": "Кратък надпис",
        "type": "text"
      },
      {
        "name": "title",
        "label": "Заглавие",
        "type": "textarea"
      },
      {
        "name": "button",
        "label": "Бутон за търсене",
        "type": "text"
      },
      {
        "name": "popularLabel",
        "label": "Надпис за популярните марки",
        "type": "text"
      },
      {
        "name": "popular",
        "label": "Популярни марки",
        "type": "array",
        "maxRows": 30,
        "fields": [
          {
            "name": "label",
            "label": "Марка",
            "type": "text",
            "required": true
          }
        ]
      }
    ]
  },
  {
    "name": "strip",
    "label": "Кратки предимства",
    "type": "group",
    "fields": [
      {
        "name": "enabled",
        "label": "Показвай секцията",
        "type": "checkbox",
        "defaultValue": true
      },
      {
        "name": "items",
        "label": "Предимства",
        "type": "array",
        "maxRows": 30,
        "fields": [
          {
            "name": "label",
            "label": "Текст",
            "type": "text",
            "required": true
          }
        ]
      }
    ]
  },
  {
    "name": "catalogue",
    "label": "Автомобили",
    "type": "group",
    "fields": [
      {
        "name": "enabled",
        "label": "Показвай секцията",
        "type": "checkbox",
        "defaultValue": true
      },
      {
        "name": "eyebrow",
        "label": "Кратък надпис",
        "type": "text"
      },
      {
        "name": "title",
        "label": "Заглавие",
        "type": "textarea"
      },
      {
        "name": "emptyTitle",
        "label": "Заглавие при липса на собствени автомобили",
        "type": "text"
      },
      {
        "name": "description",
        "label": "Текст за собствен каталог",
        "type": "textarea"
      },
      {
        "name": "emptyDescription",
        "label": "Текст за автомобили на търг",
        "type": "textarea"
      },
      {
        "name": "button",
        "label": "Виж всички — текст",
        "type": "text"
      },
      {
        "name": "href",
        "label": "Връзка към собствен каталог",
        "type": "text",
        "link": true
      },
      {
        "name": "auctionHref",
        "label": "Връзка към търгове",
        "type": "text",
        "link": true
      },
      {
        "name": "note",
        "label": "Бележка за данните от търговете",
        "type": "textarea"
      },
      {
        "name": "fallbackEyebrow",
        "label": "Надпис при недостъпен доставчик",
        "type": "text"
      },
      {
        "name": "fallbackTitle",
        "label": "Заглавие при недостъпен доставчик",
        "type": "text"
      },
      {
        "name": "fallbackText",
        "label": "Текст при недостъпен доставчик",
        "type": "textarea"
      },
      {
        "name": "fallbackButton",
        "label": "Бутон при недостъпен доставчик",
        "type": "text"
      },
      {
        "name": "artLabel",
        "label": "Декоративен надпис",
        "type": "text"
      }
    ]
  },
  {
    "name": "price",
    "label": "Цена и разходи",
    "type": "group",
    "fields": [
      {
        "name": "enabled",
        "label": "Показвай секцията",
        "type": "checkbox",
        "defaultValue": true
      },
      {
        "name": "eyebrow",
        "label": "Кратък надпис",
        "type": "text"
      },
      {
        "name": "title",
        "label": "Заглавие",
        "type": "textarea"
      },
      {
        "name": "body",
        "label": "Описание и разбивка на разходите",
        "type": "richText"
      },
      {
        "name": "button",
        "label": "Текст на бутона",
        "type": "text"
      },
      {
        "name": "href",
        "label": "Връзка на бутона",
        "type": "text",
        "link": true
      },
      {
        "name": "secondaryButton",
        "label": "Втори бутон",
        "type": "text"
      },
      {
        "name": "secondaryHref",
        "label": "Връзка на втория бутон",
        "type": "text",
        "link": true
      }
    ]
  },
  {
    "name": "commission",
    "label": "Нашата услуга",
    "type": "group",
    "fields": [
      {
        "name": "eyebrow",
        "label": "Кратък надпис",
        "type": "text"
      },
      {
        "name": "title",
        "label": "Заглавие",
        "type": "textarea"
      },
      {
        "name": "amount",
        "label": "Показвана сума",
        "type": "text",
        "admin": {
          "description": "Променя само текста на началната страница, не тарифата в калкулатора. Съгласувай цените преди редакция."
        }
      },
      {
        "name": "description",
        "label": "Описание",
        "type": "textarea"
      },
      {
        "name": "items",
        "label": "Включени условия",
        "type": "array",
        "maxRows": 30,
        "fields": [
          {
            "name": "label",
            "label": "Текст",
            "type": "text",
            "required": true
          }
        ]
      },
      {
        "name": "note",
        "label": "Условия и уточнения",
        "type": "textarea"
      },
      {
        "name": "button",
        "label": "Текст на бутона",
        "type": "text"
      },
      {
        "name": "href",
        "label": "Връзка на бутона",
        "type": "text",
        "link": true
      }
    ]
  },
  {
    "name": "trust",
    "label": "Галерия и отзиви",
    "type": "group",
    "fields": [
      {
        "name": "enabled",
        "label": "Показвай секцията",
        "type": "checkbox",
        "defaultValue": true
      },
      {
        "name": "eyebrow",
        "label": "Кратък надпис",
        "type": "text"
      },
      {
        "name": "title",
        "label": "Заглавие",
        "type": "textarea"
      },
      {
        "name": "description",
        "label": "Въведение",
        "type": "textarea"
      },
      {
        "name": "button",
        "label": "Текст на бутона",
        "type": "text"
      },
      {
        "name": "href",
        "label": "Връзка на бутона",
        "type": "text",
        "link": true
      },
      {
        "name": "photos",
        "label": "Снимки",
        "type": "array",
        "maxRows": 30,
        "fields": [
          {
            "name": "image",
            "label": "Снимка",
            "type": "upload",
            "relationTo": "media"
          },
          {
            "name": "path",
            "label": "Адрес на съществуваща снимка",
            "type": "text",
            "link": true
          },
          {
            "name": "caption",
            "label": "Надпис",
            "type": "text"
          },
          {
            "name": "alt",
            "label": "Описание на снимката",
            "type": "text"
          },
          {
            "name": "href",
            "label": "Връзка",
            "type": "text",
            "link": true
          }
        ]
      },
      {
        "name": "reviews",
        "label": "Отзиви",
        "type": "array",
        "maxRows": 30,
        "fields": [
          {
            "name": "name",
            "label": "Име",
            "type": "text"
          },
          {
            "name": "car",
            "label": "Автомобил",
            "type": "text"
          },
          {
            "name": "quote",
            "label": "Отзив",
            "type": "textarea"
          }
        ]
      },
      {
        "name": "googleLabel",
        "label": "Текст на връзката към Google",
        "type": "text"
      },
      {
        "name": "googleHref",
        "label": "Връзка към Google отзиви",
        "type": "text",
        "link": true
      }
    ]
  },
  {
    "name": "process",
    "label": "Как работим",
    "type": "group",
    "fields": [
      {
        "name": "enabled",
        "label": "Показвай секцията",
        "type": "checkbox",
        "defaultValue": true
      },
      {
        "name": "eyebrow",
        "label": "Кратък надпис",
        "type": "text"
      },
      {
        "name": "title",
        "label": "Заглавие",
        "type": "textarea"
      },
      {
        "name": "button",
        "label": "Текст на бутона",
        "type": "text"
      },
      {
        "name": "href",
        "label": "Връзка на бутона",
        "type": "text",
        "link": true
      },
      {
        "name": "steps",
        "label": "Стъпки",
        "type": "array",
        "maxRows": 30,
        "fields": [
          {
            "name": "title",
            "label": "Заглавие",
            "type": "text"
          },
          {
            "name": "text",
            "label": "Описание",
            "type": "textarea"
          }
        ]
      },
      {
        "name": "note",
        "label": "Срокове и уточнения",
        "type": "richText"
      },
      {
        "name": "guide",
        "label": "Допълнителни разяснения",
        "type": "array",
        "maxRows": 30,
        "fields": [
          {
            "name": "title",
            "label": "Заглавие",
            "type": "text"
          },
          {
            "name": "body",
            "label": "Съдържание",
            "type": "richText"
          }
        ]
      }
    ]
  },
  {
    "name": "services",
    "label": "Услуги",
    "type": "group",
    "fields": [
      {
        "name": "enabled",
        "label": "Показвай секцията",
        "type": "checkbox",
        "defaultValue": true
      },
      {
        "name": "eyebrow",
        "label": "Кратък надпис",
        "type": "text"
      },
      {
        "name": "title",
        "label": "Заглавие",
        "type": "textarea"
      },
      {
        "name": "button",
        "label": "Текст на бутона",
        "type": "text"
      },
      {
        "name": "href",
        "label": "Връзка на бутона",
        "type": "text",
        "link": true
      },
      {
        "name": "items",
        "label": "Услуги",
        "type": "array",
        "maxRows": 30,
        "fields": [
          {
            "name": "title",
            "label": "Заглавие",
            "type": "text"
          },
          {
            "name": "text",
            "label": "Описание",
            "type": "textarea"
          },
          {
            "name": "href",
            "label": "Връзка",
            "type": "text",
            "link": true
          }
        ]
      }
    ]
  },
  {
    "name": "dealers",
    "label": "За автокъщи и търговци",
    "type": "group",
    "fields": [
      {
        "name": "enabled",
        "label": "Показвай секцията",
        "type": "checkbox",
        "defaultValue": true
      },
      {
        "name": "eyebrow",
        "label": "Кратък надпис",
        "type": "text"
      },
      {
        "name": "title",
        "label": "Заглавие",
        "type": "textarea"
      },
      {
        "name": "description",
        "label": "Описание",
        "type": "textarea"
      },
      {
        "name": "button",
        "label": "Текст на бутона",
        "type": "text"
      },
      {
        "name": "href",
        "label": "Връзка на бутона",
        "type": "text",
        "link": true
      },
      {
        "name": "sideTitle",
        "label": "Заглавие вдясно",
        "type": "text"
      },
      {
        "name": "sideBody",
        "label": "Текст вдясно",
        "type": "richText"
      },
      {
        "name": "sideButton",
        "label": "Връзка вдясно — текст",
        "type": "text"
      },
      {
        "name": "sideHref",
        "label": "Връзка вдясно",
        "type": "text",
        "link": true
      }
    ]
  },
  {
    "name": "faq",
    "label": "Въпроси и отговори",
    "type": "group",
    "fields": [
      {
        "name": "enabled",
        "label": "Показвай секцията",
        "type": "checkbox",
        "defaultValue": true
      },
      {
        "name": "eyebrow",
        "label": "Кратък надпис",
        "type": "text"
      },
      {
        "name": "title",
        "label": "Заглавие",
        "type": "textarea"
      },
      {
        "name": "items",
        "label": "Въпроси",
        "type": "array",
        "maxRows": 30,
        "fields": [
          {
            "name": "question",
            "label": "Въпрос",
            "type": "text",
            "required": true
          },
          {
            "name": "answer",
            "label": "Отговор",
            "type": "richText"
          }
        ]
      },
      {
        "name": "more",
        "label": "Допълнителен текст и връзки",
        "type": "richText"
      }
    ]
  },
  {
    "name": "news",
    "label": "Последни статии",
    "type": "group",
    "fields": [
      {
        "name": "enabled",
        "label": "Показвай секцията",
        "type": "checkbox",
        "defaultValue": true
      },
      {
        "name": "eyebrow",
        "label": "Кратък надпис",
        "type": "text"
      },
      {
        "name": "title",
        "label": "Заглавие",
        "type": "textarea"
      },
      {
        "name": "button",
        "label": "Текст на бутона",
        "type": "text"
      },
      {
        "name": "href",
        "label": "Връзка на бутона",
        "type": "text",
        "link": true
      },
      {
        "name": "readMore",
        "label": "Прочети повече — текст",
        "type": "text"
      }
    ]
  },
  {
    "name": "community",
    "label": "Viber група",
    "type": "group",
    "fields": [
      {
        "name": "enabled",
        "label": "Показвай секцията",
        "type": "checkbox",
        "defaultValue": true
      },
      {
        "name": "eyebrow",
        "label": "Кратък надпис",
        "type": "text"
      },
      {
        "name": "title",
        "label": "Заглавие",
        "type": "textarea"
      },
      {
        "name": "description",
        "label": "Описание",
        "type": "textarea"
      },
      {
        "name": "button",
        "label": "Текст на бутона",
        "type": "text"
      },
      {
        "name": "href",
        "label": "Връзка на бутона",
        "type": "text",
        "link": true
      },
      {
        "name": "image",
        "label": "QR изображение",
        "type": "upload",
        "relationTo": "media"
      },
      {
        "name": "imagePath",
        "label": "Адрес на съществуващ QR код",
        "type": "text",
        "link": true
      },
      {
        "name": "imageAlt",
        "label": "Описание на изображението",
        "type": "text"
      }
    ]
  },
  {
    "name": "company",
    "label": "Фирмени данни",
    "type": "group",
    "fields": [
      {
        "name": "enabled",
        "label": "Показвай секцията",
        "type": "checkbox",
        "defaultValue": true
      },
      {
        "name": "body",
        "label": "Фирма, връзки и платформи",
        "type": "richText"
      }
    ]
  },
  {
    "name": "cta",
    "label": "Финален призив",
    "type": "group",
    "fields": [
      {
        "name": "enabled",
        "label": "Показвай секцията",
        "type": "checkbox",
        "defaultValue": true
      },
      {
        "name": "eyebrow",
        "label": "Кратък надпис",
        "type": "text"
      },
      {
        "name": "title",
        "label": "Заглавие",
        "type": "textarea"
      },
      {
        "name": "description",
        "label": "Описание",
        "type": "textarea"
      },
      {
        "name": "button",
        "label": "Текст на бутона",
        "type": "text"
      },
      {
        "name": "href",
        "label": "Връзка на бутона",
        "type": "text",
        "link": true
      }
    ]
  }
]
function materialize(items: any[]): Field[] {
 return items.map(({link,fields,...field}) => ({...field,...(fields?{fields:materialize(fields)}:{}),...(link?{validate:(v:unknown)=>!v||validHomeLink(v)?true:'Въведи локална връзка /… или HTTPS адрес.'}:{}),...(field.name==='imagePath'||field.name==='path'?{validate:(v:unknown)=>!v||(typeof v==='string'&&/^\\/(?!\\/)[^\\\\\\s]+$/.test(v))?true:'Избери снимка от Медия или локален адрес /images/…'}:{})})) as Field[]
}
export const homeFields = materialize(definitions)
