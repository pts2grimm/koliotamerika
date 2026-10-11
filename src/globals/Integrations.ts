import { APIError, type Field, type GlobalConfig } from 'payload'
import { encryptIntegrationToken, integrationSecrets } from '../lib/integration-secrets'
import { idPatterns } from '../lib/integration-config'

const toggle = (name: string, label: string): Field => ({ name, label, type: 'checkbox', defaultValue: false })
const code = (name: keyof typeof idPatterns, label: string, description: string): Field => ({
  name, label, type: 'text', maxLength: 200, admin: { description },
  validate: (value: unknown) => !value || typeof value === 'string' && idPatterns[name].test(value) || 'Въведи само кода, без HTML, интервали или адрес.',
})
export const Integrations: GlobalConfig = {
  slug: 'integrations', label: 'Интеграции',
  admin: { group: 'Настройки', description: 'Свързване с аналитични и рекламни платформи. Запази настройките, после провери събитията в съответната платформа. Наличен код не означава потвърдена връзка.' },
  access: { read: ({ req }) => req.user?.collection === 'users', update: ({ req }) => req.user?.collection === 'users' },
  hooks: {
    beforeChange: [({ data, originalDoc }) => {
      const next = { ...originalDoc, ...data }
      const required: [boolean, string, string][] = [
        [next.enabled && next.installation === 'gtm', 'gtmId', 'Google Tag Manager ID'],
        [next.gaEnabled, 'gaId', 'GA4 Measurement ID'],
        [next.adsEnabled, 'adsId', 'Google Ads ID'],
        [next.adsEnabled, 'adsLeadLabel', 'Google Ads conversion label'],
        [next.pixelEnabled || next.capiEnabled, 'pixelId', 'Meta Pixel / Dataset ID'],
        [next.clarityEnabled, 'clarityId', 'Clarity Project ID'],
      ]
      for (const [active, field, label] of required) if (active && !next[field]) throw new APIError('Липсва ' + label + '.', 400)
      if (data.clearMetaToken === true) data.metaAccessToken = null
      else if (typeof data.metaAccessToken === 'string' && data.metaAccessToken.trim()) {
        const token = data.metaAccessToken.trim()
        if (token.length > 4096 || !/^[A-Za-z0-9_.|-]+$/.test(token)) throw new APIError('Невалиден формат на CAPI токен.', 400)
        data.metaAccessToken = encryptIntegrationToken(token)
      } else data.metaAccessToken = originalDoc?.metaAccessToken || null
      if (next.capiEnabled && !data.metaAccessToken) throw new APIError('Добави CAPI токен или изключи CAPI преди записване.', 400)
      data.clearMetaToken = false
      return data
    }],
    afterRead: [({ doc, context }) => {
      doc.tokenConfigured = !!doc.metaAccessToken
      if (context.integrationSecrets !== integrationSecrets) doc.metaAccessToken = ''
      doc.clearMetaToken = false
      return doc
    }],
  },
  fields: [{
    type: 'tabs', tabs: [
      { label: 'Общи', fields: [
        toggle('enabled', 'Включи проследяването'),
        { name: 'hostname', label: 'Домейн за проследяване', type: 'text', required: true, defaultValue: 'koliotamerika.bg',
          admin: { description: 'Без https:// и без път. Работи за домейна и www варианта му. Hostinger preview не се отчита, ако тук е koliotamerika.bg.' },
          validate: (v: unknown) => typeof v === 'string' && /^(?:localhost|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63})$/.test(v) || 'Въведи валиден домейн с малки латински букви.' },
        { name: 'installation', label: 'Начин на инсталиране', type: 'select', defaultValue: 'direct', required: true, options: [
          { label: 'Директно — препоръчително', value: 'direct' }, { label: 'Чрез Google Tag Manager', value: 'gtm' },
        ], admin: { description: 'Избери един начин. В режим Tag Manager директните GA4, Ads, Pixel и Clarity не се зареждат. CAPI продължава да работи отделно. За допълнителни платформи използвай GTM.' } },
      ] },
      { label: 'Google Analytics', fields: [
        toggle('gaEnabled', 'Включи GA4'),
        code('gaId', 'GA4 Measurement ID', 'Google Analytics → Admin → Data streams → Web. Формат G-XXXXXXXXXX. В стария сайт е G-PMKKD7P2GQ; използвай го, ако запазваш същата собственост. В GA4 → Enhanced measurement → Page views изключи автоматичните page views по browser history: сайтът изпраща page_view при навигация.'),
      ] },
      { label: 'Google Ads', fields: [
        toggle('adsEnabled', 'Включи Google Ads'),
        code('adsId', 'Google Ads ID', 'Google Ads → Goals → Conversions → Tag setup. Формат AW-123456789.'),
        code('adsLeadLabel', 'Conversion label за запитване', 'Само label от send_to, след наклонената черта. Изпраща conversion след успешно записано запитване. Не дублирай с импорт на същата GA4 конверсия.'),
      ] },
      { label: 'Tag Manager', fields: [
        code('gtmId', 'GTM Container ID', 'Формат GTM-XXXXXXX. В стария сайт е GTM-WHZQ4GG. Контейнерът се зарежда само при съгласие и за статистика, и за реклама. Провери и публикувай таговете в GTM.'),
      ] },
      { label: 'Meta Pixel / CAPI', fields: [
        toggle('pixelEnabled', 'Включи Meta Pixel'),
        code('pixelId', 'Meta Pixel / Dataset ID', 'Events Manager → Data sources → Settings. Само цифри. Един и същ ID за Pixel и CAPI.'),
        toggle('capiEnabled', 'Включи Meta Conversions API'),
        { name: 'metaAccessToken', label: 'Нов CAPI Access Token', type: 'text', maxLength: 8192, admin: {
          autoComplete: 'off', description: 'Events Manager → Settings → Conversions API → Generate access token. Записва се криптирано и не се показва отново. Остави празно, за да запазиш текущия токен. Не променяй PAYLOAD_SECRET в Hostinger.',
          components: { Field: '/src/components/admin/IntegrationToken#IntegrationToken' },
        } },
        { name: 'tokenConfigured', label: 'Има записан CAPI токен (не е проверка на валидността)', type: 'checkbox', virtual: true, admin: { readOnly: true } },
        { name: 'clearMetaToken', label: 'Изтрий записания токен при запазване', type: 'checkbox', virtual: true },
        code('metaTestCode', 'Test Event Code (по избор)', 'За тестово запитване: Events Manager → Test events. Докато има код, CAPI изпраща тестови събития; изчисти го за реално отчитане. Pixel остава браузърна интеграция.'),
      ] },
      { label: 'Microsoft Clarity', fields: [
        toggle('clarityEnabled', 'Включи Clarity'),
        code('clarityId', 'Clarity Project ID', 'Clarity → Settings → Setup. Само Project ID, без script. Задай Strict masking в Clarity; формите и профилните страници са защитени и от сайта.'),
      ] },
      { label: 'Потвърждение на домейна', fields: [
        code('googleVerification', 'Google Search Console', 'Само content стойността от HTML tag verification. Това потвърждава URL-prefix property; Domain property използва DNS TXT. Не предоставя достъп до отчетите.'),
        code('bingVerification', 'Bing Webmaster Tools', 'Само content стойността на msvalidate.01.'),
        code('metaVerification', 'Meta domain verification', 'Само content стойността на facebook-domain-verification.'),
      ] },
    ],
  }],
}
