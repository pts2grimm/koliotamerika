// Eridan's make directory includes equipment, boats and malformed names, and some
// marine lots are incorrectly assigned VEHTYPE_M. Keep the supported road brands
// explicit until Eridan supplies a category-aware make/model directory.
export const eridanRoadBrands = {
 Automobile: [
  'ACURA', 'ALFA ROMEO', 'ASTON MARTIN', 'AUDI', 'AUSTIN', 'BENTLEY', 'BMW', 'BUICK',
  'CADILLAC', 'CHEVROLET', 'CHRYSLER', 'CITROEN', 'DAEWOO', 'DAIHATSU', 'DATSUN',
  'DELOREAN', 'DODGE', 'EAGLE', 'FERRARI', 'FIAT', 'FISKER', 'FORD', 'GENESIS',
  'GEO', 'GMC', 'HONDA', 'HUMMER', 'HYUNDAI', 'INEOS', 'INFINITI', 'ISUZU', 'JAGUAR',
  'JEEP', 'KARMA', 'KIA', 'LADA', 'LAMBORGHINI', 'LANCIA', 'LAND ROVER', 'LEXUS',
  'LINCOLN', 'LOTUS', 'LUCID', 'MASERATI', 'MAYBACH', 'MAZDA', 'MCLAREN',
  'MERCEDES-BENZ', 'MERCEDES BENZ', 'MERCEDES', 'MERCURY', 'MG', 'MINI',
  'MITSUBISHI', 'MORGAN', 'NISSAN', 'OLDSMOBILE', 'OPEL', 'PEUGEOT', 'PLYMOUTH',
  'POLESTAR', 'PONTIAC', 'PORSCHE', 'RAM', 'RENAULT', 'RIVIAN', 'ROLLS-ROYCE',
  'ROLLS ROYCE', 'ROVER', 'SAAB', 'SATURN', 'SCION', 'SEAT', 'SKODA', 'SMART',
  'SUBARU', 'SUZUKI', 'TESLA', 'TOYOTA', 'TRIUMPH', 'VINFAST', 'VOLKSWAGEN', 'VOLVO',
 ],
 Motorcycle: [
  'APRILIA', 'BENELLI', 'BETA', 'BIG DOG', 'BIMOTA', 'BMW', 'BRIXTON', 'BUELL',
  'BSA', 'CFMOTO', 'CF MOTO', 'DUCATI', 'GAS GAS', 'GASGAS', 'HARLEY-DAVIDSON',
  'HARLEY DAVIDSON', 'HARLEY', 'HONDA', 'HUSQVARNA', 'HUSABERG', 'HYOSUNG',
  'INDIAN', 'KAWASAKI', 'KTM', 'KYMCO', 'LANCE', 'LIVEWIRE', 'MOTO GUZZI',
  'MOTO MORINI', 'MV AGUSTA', 'NORTON', 'PIAGGIO', 'ROYAL ENFIELD', 'SHERCO',
  'SUZUKI', 'SYM', 'TRIUMPH', 'URAL', 'VESPA', 'VICTORY', 'YAMAHA', 'ZERO',
 ],
} as const
export type EridanRoadType = keyof typeof eridanRoadBrands
export const eridanRoadTypes: EridanRoadType[] = ['Automobile', 'Motorcycle']
const key = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
const brandKeys = Object.fromEntries(eridanRoadTypes.map(type => [type, new Set(eridanRoadBrands[type].map(key))])) as Record<EridanRoadType, Set<string>>
export function isEridanRoadMake(make: string, type?: EridanRoadType) {
 return (type ? [type] : eridanRoadTypes).some(type => brandKeys[type].has(key(make)))
}
export function isEridanRoadModel(model: string) {
 const value = model.trim()
 return Boolean(value) && !/^(?:SXS\d|TRX\d|FOURTRAX|PIONEER|TALON|MULE|TERYX|BRUTE FORCE|YXZ\d|YFM\d|YXR\d|YXE\d|KFX\d|KRF\d|KRT\d|KVF\d|LT-?[AZF]?\d)/i.test(value) && !/^(?:unknown|unk|other|n\/a|none|not specified|[?*.-]+)$/i.test(value) &&
  !/\b(?:boat|marine|outboard|waverunner|wave runner|jet ski|jetski|seadoo|sea doo|atv|utv|snowmobile|mower|tractor|trailer|forklift|excavator)\b/i.test(value)
}
