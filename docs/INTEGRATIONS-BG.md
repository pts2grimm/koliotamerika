# Интеграции и измерване

Настройките са в **Администрация → Настройки → Интеграции** (/admin/globals/integrations). Записването не изисква Redeploy. Настройките важат след ново отваряне/презареждане на публичната страница.

## Какво е включено

| Интеграция | Какво въвеждаш | Какво изпраща сайтът |
| --- | --- | --- |
| Google Analytics 4 | G-… и включване | page_view, generate_lead, contact_click |
| Google Ads | AW-… + conversion label | conversion след записано запитване; transaction_id |
| Google Tag Manager | GTM-… + режим Tag Manager | koa_page_view, koa_lead, koa_contact_click в dataLayer |
| Meta Pixel | Pixel/Dataset ID | PageView, Lead |
| Meta Conversions API | Същия ID + Access Token | Lead от сървъра, само след успешно записано запитване |
| Microsoft Clarity | Project ID | Измерване на взаимодействията след съгласие |
| Search Console, Bing, Meta | HTML verification content | Съответният meta tag, без проследяване |

Допълнителни платформи като TikTok, LinkedIn и Microsoft Advertising могат да се добавят през GTM. Не са инсталирани автоматично и не трябва да се поставят произволни script блокове в CMS.

CAPI в този етап отчита **запитвания**, а не продажби на автомобили. Няма измислена Purchase конверсия или стойност на продажба. PageView е браузърно Pixel събитие. Няма публичен endpoint за изпращане на произволни CAPI събития.

## Първа настройка

1. Остави главното включване изключено, докато въвеждаш кодовете.
2. Домейн: koliotamerika.bg. www вариантът също се приема. NEXT_PUBLIC_SERVER_URL в Hostinger трябва да е реалният адрес на сайта. PREVIEW_MODE=true блокира проследяването.
3. Избери **Директно**, ако настройваш платформите от тази администрация. Не е нужно да включваш всички доставчици.
4. Попълни ID-тата и включи желаните услуги. Предишният WordPress използва G-PMKKD7P2GQ и GTM-WHZQ4GG; те са посочени като ориентир, без автоматично активиране. Увери се, че имаш достъп до правилните акаунти.
5. За CAPI създай токен в Meta Events Manager → Settings → Conversions API. Постави го само в password полето в администрацията. Не изпращай токена в чат.
6. След прехвърлянето към основния домейн включи проследяването и изпълни проверките по-долу.

За контролирана проверка на preview може временно да се избере неговият hostname и отделни тестови IDs. Това изпраща данни към избраните платформи след съгласие. Не смесвай тестовите посещения с основните акаунти. Meta Test Event Code засяга само CAPI; браузърният Pixel не се превключва автоматично в тестов режим.

## Без двойно отчитане

- Режимите **Директно** и **Tag Manager** са взаимно изключващи се за браузърните доставчици. В режим GTM директните GA4, Ads, Pixel и Clarity не се зареждат.
- При директен GA4 сайтът изпраща page_view при първото разрешено посещение и при промяна на пътя. В GA4 → Data stream → Enhanced measurement → Page views изключи автоматичното отчитане при промени в browser history. Не добавяй втори page_view таг.
- Ако ползваш GTM: създай custom event triggers за koa_page_view, koa_lead и koa_contact_click. Не дублирай koa_page_view с All Pages/History Change pageview таг. Полетата са page_location, page_path, event_id и contact_method; няма имейл, телефон, име или текст на запитването.
- За Meta Lead през GTM използвай event_id от koa_lead като **Event ID** на браузърния Pixel. Същият ID се изпраща в CAPI като event_id и името е Lead. Използвай същия Pixel/Dataset ID.
- В Google Ads избери дали основната конверсия идва директно от Ads тага или от импорт на GA4 generate_lead. Не прави и двете основни конверсии за едно запитване.
- Не се зареждат старите WordPress CookieYes/PixelYourSite скриптове.

Сайтът не може да променя или проверява автоматично съдържанието на външния GTM контейнер и настройките в GA4/Ads. Те трябва да се прегледат в съответния акаунт.

## Съгласие и данни

- Без съгласие не се зареждат аналитични/рекламни скриптове. Използва се basic Consent Mode v2.
- Статистика разрешава GA4/Clarity; реклама разрешава Ads/Meta. GTM изисква и двете, защото контейнерът може да съдържа тагове от двете категории.
- Бутонът „Настройки на бисквитките“ остава във футъра. Изборът се пази 180 дни. При оттегляне страницата се презарежда, за да премахне вече изпълнените библиотеки; достъпните first-party бисквитки за оттеглената категория се изчистват.
- CAPI изисква маркетингово съгласие както в cookie, така и при изпращане на формата. Изпраща SHA-256 хешове на нормализирани имейл/телефон, event ID/време, URL без query/hash, user-agent и валидни налични _fbp/_fbc. Не изпраща име, текст, бюджет, парола или IP адрес.
- Хешираните контакти остават лични данни. Публичната политика има отделна актуална секция за инструментите.
- GA4 получава само разрешени параметри за кампания/рекламно кликване (utm_*, gclid, gbraid, wbraid), с ограничен формат. Произволни query параметри и fragments не се изпращат от нашите events. В първия referrer се запазва само origin; при вътрешна навигация — предишната измерена страница.
- Никога не поставяй лични данни в имена на кампании или публични URL-и. Външните библиотеки могат да четат текущия публичен URL.
- Администрацията е в отделен layout. Входът, регистрацията, профилът и страниците за парола не зареждат тракери. Линковете към тях използват пълна навигация, за да не останат history listeners от публична страница.
- Формата за запитване е маскирана за Clarity. Допълнително избери **Strict masking** в Clarity и провери записите преди редовна употреба.

## Съхранение и устойчивост

Настройките са в нова таблица integrations в Turso. Миграцията само добавя тази таблица и запазва съществуващите потребители, съдържание и сесии. Rollback не изтрива настройките.

CAPI токенът се криптира с AES-256-GCM с ключ, извлечен от PAYLOAD_SECRET. Токенът не се връща нито в публичен HTML, нито в REST отговорите към администратор. Празно поле го запазва; отметката за изтриване го премахва (първо изключи CAPI). Не променяй PAYLOAD_SECRET при Redeploy. При смяна на този секрет въведи CAPI токена отново.

CAPI се изпълнява след отговора чрез Next after(), с 4-секунден timeout на опит и най-много едно повторение при HTTP 5xx със същия event ID. Неуспех в Meta не отменя запитването. Това е best-effort доставка, без постоянна опашка: рестарт на процеса може да загуби незавършено събитие. В логовете има общо предупреждение, без токен/контакти/съдържание на отговора.

## Проверка преди активиране

- Без съгласие и след „Само необходимите“: никакви requests към доставчиците.
- GA4 Realtime/DebugView или Tag Assistant: едно page_view на навигация, един generate_lead след записана форма. Кликът върху телефон е contact_click, не завършена продажба.
- Meta Events Manager → Test Events: с временен Test Event Code изпрати едно запитване. Провери server Lead, browser Lead и еднаквите IDs/deduplication. След теста изчисти кода.
- Google Ads: провери правилния conversion label и диагностиката; не приемай записан ID за доказана доставка.
- Clarity: провери, че се получава запис след съгласие и полетата остават скрити.
- Оттегли съгласие и провери отново. Тествай и телефон.
- Search Console verification потвърждава URL-prefix собствеността, но не дава на ChatGPT достъп до GSC данните. Domain property използва DNS TXT.

## Технически източници

- [Google Consent Mode](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic)
- [GA4 single-page applications](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications)
- [Clarity ConsentV2](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2)
- [Meta Conversions API](https://developers.facebook.com/docs/marketing-api/conversions-api/using-the-api)
- [Meta event deduplication](https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events)
- [Meta official SDK API version](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/apiconfig.py)

Meta Graph API е v26.0 според официалния SDK при разработката. Документационните страници на Meta върнаха 429 при автоматичната проверка; реалните права/доставка трябва да се потвърдят в Events Manager.
