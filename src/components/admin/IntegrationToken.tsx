'use client'
import { useField } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
export const IntegrationToken: TextFieldClientComponent = ({ path }) => {
  const { value, setValue } = useField<string>({ path })
  return <div className="field-type text"><label className="field-label" htmlFor="integration-token">Нов CAPI Access Token</label>
    <input id="integration-token" type="password" autoComplete="new-password" value={value || ''} onChange={e => setValue(e.target.value)} />
    <p className="field-description">Events Manager → Settings → Conversions API → Generate access token. Криптира се след записване. Празно поле запазва текущия токен. Не променяй PAYLOAD_SECRET в Hostinger.</p>
  </div>
}
