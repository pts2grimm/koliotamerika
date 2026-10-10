import { cms } from './data'
import type { CalculatorConfig } from './calculate'
export async function calculatorSettings(): Promise<CalculatorConfig> { const settings=await (await cms()).findGlobal({slug:'calculator-settings'});return { ...settings,tiers:settings.tiers || [] } }
