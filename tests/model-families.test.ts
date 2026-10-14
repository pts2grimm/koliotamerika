import assert from 'node:assert/strict'
import {test} from 'node:test'
import {modelFamily,groupModelDirectory} from '../src/lib/auction-providers/model-families'
test('groups engine and trim variants across makes without merging distinct model families',()=>{
 const cases:[string,string,string][]=[
 ['BMW','320 I XDRIVE','3 SERIES'],['BMW','328I GRAN TURISMO','3 SERIES'],['BMW','330','3 SERIES'],['BMW','M340XI','3 SERIES'],
 ['BMW','3-SERIES 325CI 2D CO','3 SERIES'],['BMW','535 IGT','5 SERIES'],['BMW','X5 XDRIVE50E','X5'],['BMW','X3 M40I','X3'],
 ['BMW','M3 COMPETITION','M3'],['BMW','3 SERIES M3','M3'],['BMW','M4 CSL','M4'],['BMW','R 1250 GS','R 1250 GS'],
 ['MERCEDES-BENZ','C300','C-CLASS'],['MERCEDES BENZ','AMG C 43','C-CLASS'],['MERCEDES-BENZ','C-CLASS C300','C-CLASS'],
 ['MERCEDES-BENZ','CLA 250','CLA'],['MERCEDES-BENZ','CLK 320','CLK'],['MERCEDES-BENZ','GLC 300','GLC'],
 ['MERCEDES-BENZ','EQE 350 SUV','EQE SUV'],['MERCEDES-BENZ','EQE 350+','EQE'],
 ['AUDI','A4 PREMIUM PLUS','A4'],['AUDI','A4 2.0T QU','A4'],['AUDI','S4 AVANT Q','S4'],['AUDI','RS 4','RS4'],
 ['AUDI','ALL-NEW Q5','Q5'],['AUDI','A6 E-TRON','A6 E-TRON'],['AUDI','Q8 E-TRON PREMIUM PLUS','Q8 E-TRON'],
 ['LEXUS','RX350','RX'],['LEXUS','NX 350H BASE','NX'],['LEXUS','IS 250 AWD','IS'],
 ['VOLKSWAGEN','GOLF GTI','GOLF'],['VOLKSWAGEN','GTI AUTOBA','GOLF'],['VOLKSWAGEN','JETTA GLI','JETTA'],
 ['VOLKSWAGEN','ATLAS CROSS SPORT SE','ATLAS CROSS SPORT'],['VOLKSWAGEN','ATLAS SE','ATLAS'],
 ['TOYOTA','COROLLA LE','COROLLA'],['TOYOTA','COROLLA CROSS HYBRID','COROLLA CROSS'],['TOYOTA','RAV 4 XSE','RAV4'],
 ['TOYOTA','PRIUS V TWO','PRIUS V'],['TOYOTA','PRIUS PRIME','PRIUS'],['FORD','F-150 XLT','F-150'],['FORD','F150 XLT','F-150'],
 ['FORD','MUSTANG MACH-E PREMIUM','MUSTANG MACH-E'],['FORD','MUSTANG GT','MUSTANG'],['FORD','BRONCO SPORT BADLANDS','BRONCO SPORT'],
 ['HONDA','CIVIC EX','CIVIC'],['HONDA','CBR600RR','CBR600RR'],['MAZDA','CX5 TOURING','CX-5'],['MAZDA','MAZDA 3 PREMIUM','MAZDA3'],
 ['PORSCHE','CAYENNEGTS','CAYENNE'],['VOLKSWAGEN','ATLAS CROS','ATLAS CROSS SPORT'],['TOYOTA','COROLLA CRS L','COROLLA CROSS'],['TOYOTA','CAMRY/LE/X','CAMRY'],['BMW','3','3 SERIES'],['PORSCHE','MACAN GTS','MACAN'],['PORSCHE','CAYENNE TURBO','CAYENNE'],['KIA','SPORTAGE EX','SPORTAGE'],
 ['HYUNDAI','IONIQ 5 LIMITED','IONIQ 5'],['HYUNDAI','IONIQ 6 SEL','IONIQ 6'],['NISSAN','ROGUE SPORT S','ROGUE SPORT'],
 ['JEEP','GRAND CHEROKEE L LIMITED','GRAND CHEROKEE L'],['TESLA','MODEL 3 LONG RANGE','MODEL 3'],
 ['LAND ROVER','RANGE ROVER SPORT HSE','RANGE ROVER SPORT'],['VOLVO','XC60 T6','XC60'],['ACURA','MDX TECHNOLOGY','MDX'],
 ['POLARIS','SPORTSMAN 570','SPORTSMAN 570'],['YAMAHA','YZF-R6','YZF-R6'],['UNKNOWN BRAND','DISTINCT MODEL','DISTINCT MODEL']
 ]
 for(const [make,model,family] of cases)assert.equal(modelFamily(make,model),family,make+' '+model)
})
test('directory grouping retains every usable model ID, deduplicates IDs and keeps unknown names',()=>{
 const rows=[{id:1,name:'330I'},{id:2,name:'328'},{id:3,name:'3 SERIES'},{id:4,name:'M3'},{id:5,name:'UNMAPPED CLASSIC'},{id:6,name:'UNKNOWN'},{id:1,name:'330I'}]
 const groups=groupModelDirectory('BMW',rows)
 assert.deepEqual(groups.get('3 SERIES'),[1,2,3])
 assert.deepEqual(groups.get('M3'),[4]);assert.deepEqual(groups.get('UNMAPPED CLASSIC'),[5]);assert.equal(groups.has('UNKNOWN'),false)
})

test('CAN-AM Renegade directory variants share one family across make spellings',()=>{
 const variants=['RENEGADE X','RENEGADE 6','RENEGADE 650','RENEGADE 8','RENEGADE','RENEGADE X XC 1000R','RENEGADE X MR 1000R','RENEGADE X MR 650','RENEGADE 110 EFI','RENEGADE 570']
 for(const make of ['CAN-AM','CAN AM','CANAM']){
  const rows=variants.map((name,i)=>({id:i+1,name}))
  rows.push({id:11,name:'OUTLANDER 650'},{id:12,name:'RYKER 900'})
  const groups=groupModelDirectory(make,rows)
  assert.deepEqual(groups.get('RENEGADE'),variants.map((_,i)=>i+1))
  assert.deepEqual(groups.get('OUTLANDER 650'),[11])
  assert.deepEqual(groups.get('RYKER 900'),[12])
 }
})
