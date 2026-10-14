// One client tariff for standard passenger cars. Source/selection documented in docs/CUSTOMER-PRICING-BG.md.
export const commissionEur = 1000
export const gateUsd = 95
export const environmentalUsd = 15
export const purchaseBands: readonly (readonly [number, number])[] = [
 [0,27.5],[50,50],[100,90],[200,145],[300,155],[350,167.5],[400,200],[450,210],
 [500,235],[550,240],[600,275],[700,312.5],[800,342.5],[900,370],[1000,440],
 [1200,460],[1300,482.5],[1400,510],[1500,530],[1600,555],[1700,582.5],[1800,620],
 [2000,662.5],[2400,705],[2500,775],[3000,830],[3500,927.5],[4000,935],[4500,1000],
 [5000,1025],[5500,1055],[6000,1085],[6500,1110],[7000,1145],[7500,1175],
 [8000,1200],[8500,1225],[9000,1225],[10000,1390],[10500,1390],[11000,1390],
 [11500,1400],[12000,1400],[12500,1400]
]
export const onlineBands: readonly (readonly [number, number])[] = [[0,0],[100,50],[500,65],[1000,85],[1500,95],[2000,110],[4000,125],[6000,145],[8000,160]]
export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
export function purchaseFee(price: number) {
 if (!Number.isFinite(price) || price < 0 || price > 500000) return null
 return price >= 15000 ? roundMoney(price * 0.125) : [...purchaseBands].reverse().find(([from]) => price >= from)![1]
}
export function onlineFee(price: number) {
 if (!Number.isFinite(price) || price < 0 || price > 500000) return null
 return [...onlineBands].reverse().find(([from]) => price >= from)![1]
}
export const exampleCosts = { usdToEur: 0.9, defaultInland: 500, shippingUsd: 1000, insuranceUsd: 200, documentUsd: 20, portHandlingEur: 300, deliveryEur: 1000 }
