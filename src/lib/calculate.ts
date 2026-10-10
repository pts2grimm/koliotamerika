export type CalculatorConfig = { usdToBgn: number; fixedCosts: number; tiers: { from: number; fee: number; percent: number; extra: number }[]; defaultInland?: number | null; defaultShipping?: number | null; note?: string | null }
export function calculateImport(price: number, inland: number, shipping: number, config: CalculatorConfig) {
 if (![price,inland,shipping].every(Number.isFinite) || price <= 0 || price > 500000 || inland < 0 || inland > 100000 || shipping < 0 || shipping > 100000) return null
 const tier=[...config.tiers].sort((a,b)=>b.from-a.from).find(t=>price>=t.from)
 if(!tier || !Number.isFinite(config.usdToBgn) || config.usdToBgn<=0)return null
 const fee=tier.fee+price*tier.percent/100
 const vehicleBgn=(price+fee+inland+shipping)*config.usdToBgn
 const extra=tier.extra+config.fixedCosts
 const totalBgn=Math.round((vehicleBgn+extra)*100)/100
 return { fee, vehicleBgn, extra, totalBgn, totalEur:Math.round(totalBgn/1.95583*100)/100 }
}
