import { publicArticles } from '@/lib/public-content'
import { editorialImage } from '@/lib/editorial-images'
import snapshot from '../../content/homepage.json'
import gallery from '../../content/legacy-gallery.json'
import { mediaUrl, imageAlt } from '@/lib/data'
import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import { SiteLink as Link } from './SiteLink'
function Copy({html}:{html:string}) {return <div className="home-copy" dangerouslySetInnerHTML={{__html:html}}/>}
type HomeQuestion={id?:string|null;question:string;answer:string}
export function additionalHomeFAQ(faq?:HomeQuestion[]|null) {return (faq||[]).filter(item=>!snapshot.faq.some(original=>original.question===item.question))}
export function HomeTrust({googleMapsURL}:{googleMapsURL?:string|null}) {
 const photos=[gallery.items.find(p=>p.title==='2021 BMW M5'),gallery.items.find(p=>p.title==='2021 MERCEDES BENZ GLC 300 4MATIC'),gallery.items.find(p=>p.title==='2020 TOYOTA RAV4 LIMITED')].filter((p):p is typeof gallery.items[number]=>!!p)
 return <section className="home-proof container" id="real-cars"><div className="section-heading"><div><span className="eyebrow orange">РЕАЛНИ АВТОМОБИЛИ. СПОДЕЛЕН ОПИТ.</span><h2>Виж автомобилите.<br/>Чуй клиентите.</h2></div><Link className="text-link" href="/koli-ot-amerika-galeriya">Цялата галерия <ArrowUpRight size={18}/></Link></div>
 <p>Снимки от нашата галерия — примери, а не текущи наличности. За подобен автомобил ни изпрати модел и бюджет.</p>
 <div className="home-proof-photos">{photos.map(p=><figure key={p.src}><Link href="/koli-ot-amerika-galeriya"><Image src={p.src} width={p.width} height={p.height} sizes="(max-width:700px) 85vw,33vw" alt={p.title}/><figcaption>{p.title}</figcaption></Link></figure>)}</div>
 <div className="home-review-grid">{snapshot.testimonials.items.map(item=><figure key={item.name}><blockquote>{item.quote}</blockquote><figcaption><strong>{item.name}</strong><span>{item.car}</span></figcaption></figure>)}</div>
 {googleMapsURL&&<a className="text-link" href={googleMapsURL} target="_blank" rel="noopener noreferrer">Виж профила и отзивите в Google <ArrowUpRight size={18}/></a>}
 </section>
}
export function HomeFAQ({faq=[]}:{faq?:HomeQuestion[]|null}) {
 // Preserve CMS answers, including overrides of imported questions.
 const questions=[...snapshot.faq.map(item=>({...item,custom:faq?.find(q=>q.question===item.question)?.answer})),...additionalHomeFAQ(faq).map(item=>({question:item.question,text:item.answer,html:'',custom:item.answer}))]
 const schema={'@context':'https://schema.org','@type':'FAQPage',mainEntity:questions.map(q=>({'@type':'Question',name:q.question,acceptedAnswer:{'@type':'Answer',text:q.custom??q.text}}))}
 return <section className="container home-faq" id="home-questions"><div className="section-heading"><div><span className="eyebrow orange">ПРЕДИ ПОКУПКАТА</span><h2>Въпроси за вноса на коли от Америка</h2></div></div><div className="faq-list">{questions.map(q=><details key={q.question}><summary>{q.question}<span className="faq-plus" aria-hidden="true">+</span></summary>{q.custom!=null?<p>{q.custom}</p>:<Copy html={q.html}/>}</details>)}</div><Copy html={snapshot.faqMore}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,'\\u003c')}}/></section>
}
export function HomeGuide() {
 return <div className="home-guide-compact">{snapshot.reasons.map(item=><details key={item.heading}><summary>{item.heading}</summary><Copy html={item.html}/></details>)}</div>
}
export async function HomeSEO({viberURL}:{viberURL?:string|null}) {
 const articles=(await publicArticles(1, undefined, 3)).docs
 return <>
 <section className="container home-news"><div className="section-heading"><div><span className="eyebrow orange">ПОЛЕЗНО ПРЕДИ ПОКУПКАТА</span><h2>{snapshot.news.heading}</h2></div><Link className="text-link" href="/blog">Всички статии <ArrowUpRight size={18}/></Link></div><div className="home-news-grid">{articles.map(item=>{const cover=editorialImage(item.slug,mediaUrl(item.image),item.legacyImage);return <article key={item.id}>{cover.src&&<Link className="home-news-cover" href={'/'+item.slug} aria-label={item.title}><Image className="home-news-image" src={cover.src} width={640} height={360} sizes="(max-width:700px) 100vw,(max-width:1100px) 50vw,33vw" alt={imageAlt(item.image,cover.artwork?.alt||item.title)}/></Link>}<div className="home-news-copy"><h3><Link href={'/'+item.slug}>{item.title}</Link></h3><p>{item.intro}</p><Link className="text-link" href={'/'+item.slug}>Прочети повече <ArrowUpRight size={18}/></Link></div></article>})}</div></section>
 <section className="container home-community-compact"><div><span className="eyebrow orange">ОБЯВИ И РАЗГОВОРИ ЗА АВТОМОБИЛИ</span><h2>Следи предложенията във Viber.</h2><p>Обяви от аукциони, ориентировъчни цени и отговори на въпросите ти.</p><a className="button button-outline" href={viberURL||snapshot.viber.url} target="_blank" rel="noopener noreferrer">Към Viber групата <ArrowUpRight size={18}/></a></div><a className="viber-qr" href={viberURL||snapshot.viber.url} target="_blank" rel="noopener noreferrer"><Image src="/images/legacy/home-viber-qr.webp" width={140} height={140} alt="QR код за Viber групата на Коли от Америка"/></a></section>
 </>
}
