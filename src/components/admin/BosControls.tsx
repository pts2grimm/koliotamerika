'use client'

import { Download, FileText } from 'lucide-react'
import { useDocumentInfo, useFormFields, useFormModified } from '@payloadcms/ui'
import { bosAmounts, bosMoney, bosSeller } from '../../lib/bos'

export function BosDownload() {
  const { id } = useDocumentInfo()
  const modified = useFormModified()
  return <div className="koa-bos-download">
    {id && !modified ? <a href={'/api/admin/bos/' + encodeURIComponent(String(id)) + '/pdf'} className="koa-bos-download__button">
      <Download size={17} aria-hidden="true" /> Изтегли BOS PDF
    </a> : <span><FileText size={17} aria-hidden="true" /> Запази документа, за да изтеглиш актуален PDF.</span>}
  </div>
}
export function BosSettlement() {
  const values = useFormFields(([fields]) => [fields.vehiclePrice?.value, fields.shipping?.value, fields.paidAmount?.value])
  try {
    const { total, balance } = bosAmounts(values[0] as number, values[1] as number, values[2] as number)
    return <div className="koa-bos-summary" aria-live="polite"><span>Общо <strong>$ {bosMoney(total)}</strong></span><span>Остатък <strong>$ {bosMoney(balance)}</strong></span></div>
  } catch { return <p className="koa-bos-note">Попълни валидни суми. Платеното не може да надвишава цената и транспорта.</p> }
}
export function BosSeller() {
  return <div className="koa-bos-seller"><h3>Seller information</h3>
    <strong>{bosSeller.name}</strong><p>{bosSeller.address}<br />{bosSeller.city}<br />{bosSeller.postalCode} {bosSeller.phone}</p>
    <p>SALESPERSON: {bosSeller.salesperson}</p><small>Постоянни данни от одобрения BOS образец.</small>
  </div>
}
