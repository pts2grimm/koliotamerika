import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import type { BillOfSale } from '../payload-types'
import { bosAmounts, bosDate, bosMoney, bosSeller, bosShippingLabel } from './bos'

export class BosLayoutError extends Error {}
let fontBytes: Promise<Buffer[]> | undefined
const loadFonts = () => fontBytes ||= Promise.all([
  readFile(path.join(process.cwd(), 'assets/fonts/NotoSans-Regular.ttf')),
  readFile(path.join(process.cwd(), 'assets/fonts/NotoSans-Bold.ttf')),
]).catch(error => { fontBytes = undefined; throw error })

let signatureBytes: Promise<Buffer> | undefined
const loadSignature = () => signatureBytes ||= readFile(path.join(process.cwd(), 'assets/bos/seller-signature.png'))
  .catch(error => { signatureBytes = undefined; throw error })

export async function createBosPDF(doc: BillOfSale) {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const fallback: { font: PDFFont; chars: Set<number>; strong: boolean }[] = []
  if (/[^\x20-\x7e]/.test(JSON.stringify(doc))) {
    const bytes = await loadFonts()
    for (const strong of [false, true]) {
      const font = await pdf.embedFont(bytes[strong ? 1 : 0], { subset: true })
      fallback.push({ font, chars: new Set(font.getCharacterSet()), strong })
    }
  }
  const page = pdf.addPage([612, 792])
  const color = rgb(0, 0, 0)
  pdf.setTitle('Bill of Sale - ' + doc.stock)
  pdf.setAuthor(bosSeller.name)
  pdf.setSubject('Vehicle Bill of Sale')
  const choose = (character: string, strong = false) => {
    if (character.codePointAt(0)! >= 32 && character.codePointAt(0)! <= 126) return strong ? bold : regular
    const supported = fallback.find(item => item.strong === strong && item.chars.has(character.codePointAt(0)!))
    if (!supported) throw new BosLayoutError('PDF шрифтът не поддържа символ: ' + character)
    return supported.font
  }
  const width = (value: string, size: number, strong = false) =>
    [...value].reduce((sum, char) => sum + choose(char, strong).widthOfTextAtSize(char, size), 0)
  const drawLine = (value: string, x: number, top: number, size: number, strong = false) => {
    // Font runs preserve Cyrillic while keeping the compact Helvetica form labels.
    let offset = 0, run = '', font: PDFFont | undefined
    const flush = () => {
      if (!run || !font) return
      page.drawText(run, { x: x + offset, y: 792 - top - size, size, font, color })
      offset += font.widthOfTextAtSize(run, size); run = ''
    }
    for (const char of value) {
      const next = choose(char, strong)
      if (font !== next) { flush(); font = next }
      run += char
    }
    flush()
  }
  const text = (value: unknown, x: number, top: number, maxWidth: number, size = 8, strong = false, lines = 1) => {
    const clean = String(value ?? '').replace(/\s+/g, ' ').trim()
    if (!clean) return 0
    let rows: string[] = []
    for (let currentSize = size; currentSize >= 6; currentSize -= .25) {
      rows = ['']
      for (const word of clean.split(' ')) {
        const last = rows.length - 1
        const candidate = rows[last] ? rows[last] + ' ' + word : word
        if (width(candidate, currentSize, strong) <= maxWidth) rows[last] = candidate
        else if (width(word, currentSize, strong) <= maxWidth && rows[last]) rows.push(word)
        else { rows = Array(lines + 1).fill(''); break }
      }
      if (rows.length <= lines) {
        rows.forEach((row, index) => drawLine(row, x, top + index * (currentSize + 2), currentSize, strong))
        return rows.length * (currentSize + 2)
      }
    }
    throw new BosLayoutError('Текстът е твърде дълъг за полето в PDF: ' + clean.slice(0, 30) + '… Съкрати го преди изтегляне.')
  }
  const line = (x: number, y: number, x2: number, y2: number, thickness = .5) =>
    page.drawLine({ start: { x, y: 792 - y }, end: { x: x2, y: 792 - y2 }, thickness, color })
  const box = (x: number, y: number, w: number, h: number) =>
    page.drawRectangle({ x, y: 792 - y - h, width: w, height: h, borderColor: color, borderWidth: .5 })
  const heading = (value: string, x: number, y: number, w: number) => {
    text(value, x + 3, y + 2, w - 6, 7, true)
    line(x + 3, y + 10, x + 3 + width(value, 7, true), y + 10, .35)
  }
  const pair = (label: string, value: unknown, x: number, y: number, w: number) => text(label + (value == null || value === '' ? '' : ' ' + value), x, y, w, 7, false, 1)
  const vehiclePair = (label: string, value: unknown, x: number, y: number, w: number) => {
    const labelWidth = width(label + ' ', 7)
    text(label, x, y, w, 7)
    text(value, x + labelWidth, y, w - labelWidth, 8, true)
  }
  const date = bosDate(doc.saleDate)
  const { total, balance } = bosAmounts(doc.vehiclePrice, doc.shipping, doc.paidAmount)
  text('BILL OF SALE', 32, 32, 180, 10)
  text('DATE: ' + date, 350, 34, 110, 8)
  text('STOCK #: ' + doc.stock, 464, 34, 116, 8)

  box(32, 50, 548, 116); line(306, 50, 306, 166)
  heading('BUYER INFORMATION:', 32, 50, 274)
  // Advance by the actual wrapped height instead of reserving two rows for every field.
  let buyerTop = 64
  buyerTop += text(doc.buyerName, 36, buyerTop, 266, 9, true, 2)
  buyerTop += text(doc.buyerAddress, 36, buyerTop, 266, 8, false, 2)
  buyerTop += text([doc.buyerCity, doc.buyerPostalCode, doc.buyerCountry].filter(Boolean).join(', '), 36, buyerTop, 266, 8)
  // Keep the last contact row 4 pt above the bottom border at 166 pt.
  const contactTop = 125
  pair('HOME:', doc.buyerHomePhone, 36, contactTop, 125)
  pair('CELL:', doc.buyerPhone, 169, contactTop, 132)
  pair('D.L./STATE ID:', doc.buyerLicense, 36, contactTop + 10, 164)
  pair('WORK:', doc.buyerWorkPhone, 203, contactTop + 10, 98)
  pair('D.O.B.:', doc.buyerDOB ? bosDate(doc.buyerDOB) : '', 36, contactTop + 20, 93)
  pair('STATE:', doc.buyerState, 132, contactTop + 20, 75)
  pair('EXP.:', doc.buyerLicenseExpiry ? bosDate(doc.buyerLicenseExpiry) : '', 210, contactTop + 20, 92)
  pair('COUNTY:', doc.buyerCounty, 36, contactTop + 30, 266)
  heading('SELLER INFORMATION:', 306, 50, 274)
  text(bosSeller.name, 310, 64, 264, 12, true)
  text(bosSeller.address, 310, 79, 264, 12)
  text(bosSeller.city, 310, 94, 264, 12)
  text(bosSeller.postalCode + ' ' + bosSeller.phone, 310, 109, 264, 12)
  pair('SALESPERSON:', bosSeller.salesperson, 310, 148, 264)

  box(32, 166, 548, 62); heading('VEHICLE INFORMATION:', 32, 166, 548)
  vehiclePair('YEAR:', doc.year, 36, 181, 124)
  vehiclePair('COLOR 1:', doc.color1, 166, 181, 130)
  vehiclePair('VIN:', doc.vin, 301, 181, 160)
  vehiclePair('STOCK:', doc.stock, 466, 181, 110)
  vehiclePair('MAKE:', doc.make, 36, 195, 124)
  vehiclePair('COLOR 2:', doc.color2, 166, 195, 130)
  vehiclePair('STYLE:', doc.style, 301, 195, 160)
  vehiclePair('CYL:', doc.cylinders, 466, 195, 110)
  vehiclePair('MODEL:', doc.model, 36, 209, 124)
  vehiclePair('BODY:', doc.body, 166, 209, 130)
  vehiclePair('MILEAGE:', doc.mileage == null ? '' : new Intl.NumberFormat('en-US').format(doc.mileage), 301, 209, 160)
  vehiclePair('TRANS:', doc.transmission, 466, 209, 110)

  box(32, 228, 316, 140); heading('TRADE-IN INFORMATION:', 32, 228, 316)
  const tradeRows = [['YEAR:', 'COLOR:'], ['MAKE:', 'MILEAGE:'], ['MODEL:', 'BODY:'], ['VIN:', ''], ['OWNER:', ''], ['BALANCE OWED:', ''], ['TO:', '']]
  tradeRows.forEach(([left, right], i) => { text(left, 36, 243 + i * 13, 145, 7); text(right, 194, 243 + i * 13, 145, 7) })
  text('BALANCE OWED:                 ALLOWANCE:', 36, 343, 305, 7)
  text('GOOD THROUGH:                QUOTED BY:', 36, 355, 305, 7)
  box(32, 368, 316, 62); heading('INSURANCE INFORMATION:', 32, 368, 316)
  text('COMPANY:', 36, 382, 305, 7); text('AGENT:', 36, 395, 305, 7)
  text('PHONE:', 36, 408, 140, 7); text('POLICY #:', 194, 408, 145, 7)
  box(32, 430, 316, 64); heading('LIEN HOLDER INFORMATION:', 32, 430, 316)
  text('COMPANY:', 36, 445, 305, 7); text('STREET:', 36, 459, 305, 7)
  text('CITY, STATE, ZIP:', 36, 473, 305, 7)
  box(32, 494, 316, 76); heading('REMARKS:', 32, 494, 316)
  text(doc.remarks, 36, 510, 308, 8, false, 6)

  box(348, 228, 232, 422); text('SETTLEMENT (USD)', 355, 232, 218, 9, true)
  line(348, 244, 580, 244); line(510, 244, 510, 650)
  for (let y = 259; y < 650; y += 15) line(348, y, 580, y)
  const settlement = (row: number, label: string, amount: string, strong = false) => {
    const top = 247 + row * 15
    text(label, 352, top, 154, 7, strong)
    const size = 8
    text(amount, Math.max(514, 576 - width(amount, size, strong)), top, 62, size, strong)
  }
  settlement(0, 'VEHICLE PRICE', bosMoney(doc.vehiclePrice))
  settlement(1, bosShippingLabel, bosMoney(doc.shipping))
  settlement(4, 'SUBTOTAL', bosMoney(total), true)
  settlement(19, 'TOTAL DUE', bosMoney(total), true)
  settlement(20, 'TRADE-IN', 'N/A')
  settlement(21, 'ALLOWANCE DEPOSIT', 'N/A')
  settlement(22, 'DOWN PAYMENT / PAID', bosMoney(doc.paidAmount))
  settlement(24, 'TOTAL CREDIT', bosMoney(doc.paidAmount), true)
  settlement(25, 'BALANCE DUE', bosMoney(balance), true)

  box(32, 570, 316, 80); heading('WARRANTY DISCLAIMER:', 32, 570, 316)
  text('Unless Seller provides a written warranty, or enters into a service contract within 90 days from the date of this contract, this vehicle is being sold "AS IS" "WITH ALL FAULTS" and Seller makes no warranties, express or implied, on the vehicle, and there will be no implied warranties of merchantability or of fitness for a particular purpose.', 36, 583, 308, 7, false, 6)
  box(32, 650, 548, 38); heading('CONTRACTUAL DISCLOSURE STATEMENT (USED VEHICLES ONLY):', 32, 650, 548)
  text('The information you see on the window form for this vehicle is part of this contract. Information on the window form overrides any contrary provisions in the contract of sale.', 36, 664, 540, 7, false, 2)
  text('Buyer, by signing below, acknowledges receipt of a copy of this Bill of Sale.', 32, 690, 548, 8, false, 2)

  for (const [x, label] of [[32, 'Seller / Authorized Representative'], [220, 'Buyer'], [408, 'Co-Buyer']] as const) {
    text('X', x, 729, 10, 8)
    line(x + 12, 742, x + 172, 742)
    text(label, x + 4, 752, 172, 6.5)
    text('Date: ' + (label === 'Co-Buyer' ? '____________________' : date), x + 4, 765, 172, 7)
  }
  // Approved seller signature overlays the original form spacing at the requested size.
  // Buyer and co-buyer signature fields remain empty.
  const signature = await pdf.embedPng(await loadSignature())
  const signatureSize = signature.scale(68 / signature.height)
  page.drawImage(signature, { x: 64, y: 792 - 749, ...signatureSize })
  text('BOS ' + doc.stock + ' | ' + doc.vin, 32, 777, 548, 6)
  return pdf.save()
}
