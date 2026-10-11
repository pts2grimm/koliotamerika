import Image from 'next/image'
import examples from '../../content/legacy-examples.json'
import { SiteLink as Link } from './SiteLink'
export function LegacyExamples({slug}:{slug:string}) {
 const items=examples[slug as keyof typeof examples]
 if(!items?.length)return null
 const article=slug==='avtomobili-ot-amerikanski-aukcioni'
 return <section className="container legacy-gallery legacy-examples" aria-labelledby="examples-title">
  <div className="legacy-gallery-heading"><div><span className="eyebrow orange">В СНИМКИ</span><h2 id="examples-title">{article?'Модели, показани в статията':'Примери от галерията ни'}</h2><p>Снимките са от тази публикация. За актуални предложения и наличности се свържи с нас.</p></div></div>
  <div className="legacy-photo-grid">{items.map(item=><figure key={item.src}><a href={item.src} target="_blank" rel="noopener noreferrer" aria-label={'Отвори снимката: '+item.alt+' (нов раздел)'}><Image src={item.src} width={item.width} height={item.height} sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw" alt={item.alt} /></a><figcaption>{item.alt}</figcaption></figure>)}</div>
  <Link className="text-link" href="/koli-ot-amerika-galeriya">Разгледай цялата галерия</Link>
 </section>
}
