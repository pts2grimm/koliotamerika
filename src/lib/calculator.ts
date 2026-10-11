import { cms } from './data'
import type { CalculatorConfig } from './calculate'
import { exampleCosts } from './customer-tariff'
export async function calculatorSettings(): Promise<CalculatorConfig> {
 const settings=await(await cms()).findGlobal({slug:'calculator-settings'})
 const costs=Object.fromEntries(Object.entries(exampleCosts).map(([key,fallback])=>[key,settings[key as keyof typeof settings]??fallback])) as CalculatorConfig
 return {...costs,note:settings.note}
}
