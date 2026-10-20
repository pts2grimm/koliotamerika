// Owner-approved terminology change, 20 October 2026.
// Legacy source identifiers are retained only for redirects and rollback records.
export const retiredArticle = 'tehnotest-za-avtomobili'
export const homologationRoutes: Record<string,string> = {
 '/tehnotest': '/homologacia',
 '/2022/09/27/tehnotest': '/homologacia',
 '/tehnotest-na-koli': '/homologacia-na-koli',
 '/tehnotest-za-avtomobili': '/homologacia',
 '/tag/tehnotest': '/tag/individualno-odobryavane',
}
export const homologationImages: Record<string,string> = {
 '/wp-content/uploads/2022/09/tehnotest.jpg': '/images/legacy/wp-2809.jpg',
 '/wp-content/uploads/2022/09/tehnotest-150x83.jpg': '/images/legacy/wp-2809.jpg',
 '/wp-content/uploads/2022/09/tehnotest-300x167.jpg': '/images/legacy/wp-2809.jpg',
 '/wp-content/uploads/2022/09/tehnotest-768x426.jpg': '/images/legacy/wp-2809.jpg',
 '/wp-content/uploads/2025/09/tehnotest-za-avtomobili.webp': '/images/legacy/wp-5589.webp',
}
export function homologationHref(value:string):string {
 try {
  const url=new URL(value,'https://koliotamerika.bg')
  if(!['koliotamerika.bg','www.koliotamerika.bg'].includes(url.hostname))return value
  const path=url.pathname.replace(/\/$/,'')
  const target=homologationRoutes[path] || homologationImages[path]
  return target ? target+url.search+url.hash : value
 }catch{return value}
}
export function homologationText(value:string):string {
 return value
  .replace(/успешен\s+технотест/gi,'успешно индивидуално одобряване')
  .replace(/задължителния\s+технотест/gi,'необходимото индивидуално одобряване')
  .replace(/задължителен\s+технотест/gi,'необходимо индивидуално одобряване')
  .replace(/(?<![\p{L}\p{N}])(?:технотест(?:ът|а|ове|овете)?|tehnotest|technotest)(?![\p{L}\p{N}])/giu,match=>{
   const upper=match[0]===match[0].toUpperCase()
   const word=/ът$|та$/i.test(match)?'индивидуалното одобряване':'индивидуално одобряване'
   return upper?word[0].toUpperCase()+word.slice(1):word
  })
}
const identifiers=new Set(['id','slug','sourceURL','publishedAt','createdAt','updatedAt','status','type','relationTo'])
/** Transform actual editable text and exact local links, retaining Lexical IDs/formatting. */
export function homologationCopy<T>(value:T):T {
 if(typeof value==='string')return homologationText(value) as T
 if(Array.isArray(value))return value.map(homologationCopy) as T
 if(value&&typeof value==='object'){
  const output:Record<string,unknown>={}
  for(const [key,item] of Object.entries(value)){
   if(identifiers.has(key)){output[key]=item;continue}
   if(typeof item==='string'&&['url','href','src','legacyImage'].includes(key))output[key]=homologationHref(item)
   else output[key]=homologationCopy(item)
  }
  return output as T
 }
 return value
}
