import Image from 'next/image'
import { ArrowUpRight, Search, ShieldCheck, Ship, Check } from 'lucide-react'
import { SiteLink as Link } from './SiteLink'
import { EditorialContent } from './EditorialContent'
import { CarCard } from './CarCard'
import { AuctionPreview } from './AuctionPreview'
import { HomeSearch } from './HomeSearch'
import { publicArticles } from '@/lib/public-content'
import { editorialImage } from '@/lib/editorial-images'
import { mediaUrl, imageAlt } from '@/lib/data'
import { homeImage, richPlain, type HomeContent } from '@/lib/home-content'
import { homeLink } from '@/lib/home-links'
import type { CarCardData } from '@/lib/list-projections'

function Lines({text}:{text:string}){return <>{text.split('\n').map((line,i)=><span key={i}>{i>0&&<br/>}{line}</span>)}</>}
function Copy({data,className='home-copy'}:{data:HomeContent['price']['body'];className?:string}){return data?<div className={className}><EditorialContent data={data}/></div>:null}
function Button({label,href,className='text-link'}:{label:string;href:string;className?:string}){
 const safe=homeLink(href)
 return label&&safe?<Link className={className} href={safe}>{label} <ArrowUpRight size={18}/></Link>:null
}
function Heading({section}:{section:{eyebrow:string;title:string;button?:string;href?:string}}){
 return <div className="section-heading"><div><span className="eyebrow orange">{section.eyebrow}</span><h2><Lines text={section.title}/></h2></div><Button label={section.button||''} href={section.href||''}/></div>
}
export async function EditableHome({content:c,cars,makes}:{content:HomeContent;cars:CarCardData[];makes:Record<string,string[]>}){
 const heroImage=homeImage(c.hero.image,c.hero.imagePath)
 const articles=c.news.enabled?(await publicArticles(1,undefined,3)).docs:[]
 const qr=homeImage(c.community.image,c.community.imagePath)
 const communityHref=homeLink(c.community.href)
 const faqItems=c.faq.items.filter(q=>q.question&&richPlain(q.answer))
 const faqSchema={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faqItems.map(q=>({'@type':'Question',name:q.question,acceptedAnswer:{'@type':'Answer',text:richPlain(q.answer)}}))}
 const stripIcons=[Search,ShieldCheck,Ship]
 return <div className="home-clarity" data-home-editor="v1">
 <section className="hero hero-showcase">
 {heroImage&&<Image className="hero-photo" src={heroImage} alt={c.hero.imageAlt} fill priority sizes="100vw"/>}
 <div className="hero-shade"/><div className="container hero-content"><div className="hero-copy"><span className="eyebrow hero-eyebrow"><span className="tiny-line"/>{c.hero.eyebrow}</span><h1>{c.hero.title.split('\n').map((line,i)=><span key={i}>{line}</span>)}</h1><p>{c.hero.description}</p><div className="home-hero-actions"><Button label={c.hero.button} href={c.hero.href} className="button button-white"/><Button label={c.hero.secondaryButton} href={c.hero.secondaryHref} className="hero-secondary"/></div></div>{c.search.enabled&&<HomeSearch makes={makes} content={c.search}/>}</div>
 {c.hero.note&&<span className="photo-note">{c.hero.note}</span>}
 </section>
 {c.strip.enabled&&<div className="market-strip"><div className="container">{c.strip.items.map((item,i)=>{const Icon=stripIcons[i%stripIcons.length];return <span key={item.id||i}><Icon size={19}/>{item.label}</span>})}</div></div>}
 {c.catalogue.enabled&&<section className="catalogue-section"><div className="container"><Heading section={{...c.catalogue,title:cars.length?c.catalogue.title:c.catalogue.emptyTitle,href:cars.length?c.catalogue.href:c.catalogue.auctionHref}}/><p>{cars.length?c.catalogue.description:c.catalogue.emptyDescription}</p>
 {cars.length?<div className="car-grid">{cars.map(car=><CarCard car={car} key={car.id}/>)}</div>:<AuctionPreview content={c.catalogue}/>}
 </div></section>}
 {c.price.enabled&&<section className="container home-price" id="home-price"><div><span className="eyebrow orange">{c.price.eyebrow}</span><h2><Lines text={c.price.title}/></h2><Copy data={c.price.body} className="home-price-copy"/><div className="home-inline-links"><Button label={c.price.button} href={c.price.href}/><Button label={c.price.secondaryButton} href={c.price.secondaryHref}/></div></div>
 <div className="home-commission"><span className="eyebrow">{c.commission.eyebrow}</span><strong>{c.commission.amount}</strong><h3>{c.commission.title}</h3><p>{c.commission.description}</p><ul>{c.commission.items.map((item,i)=><li key={item.id||i}><Check size={18}/>{item.label}</li>)}</ul><p className="home-price-note">{c.commission.note}</p><Button label={c.commission.button} href={c.commission.href} className="button button-dark"/></div>
 </section>}
 {c.trust.enabled&&<section className="home-proof container" id="real-cars"><Heading section={c.trust}/><p>{c.trust.description}</p><div className="home-proof-photos">{c.trust.photos.map((photo,i)=>{const src=homeImage(photo.image,photo.path),href=homeLink(photo.href);const figure=<>{src&&<Image src={src} width={800} height={550} sizes="(max-width:700px) 85vw,33vw" alt={photo.alt}/>}<figcaption>{photo.caption}</figcaption></>;return src?<figure key={photo.id||i}>{href?<Link href={href}>{figure}</Link>:figure}</figure>:null})}</div>
 <div className="home-review-grid">{c.trust.reviews.map((item,i)=><figure key={item.id||i}><blockquote>{item.quote}</blockquote><figcaption><strong>{item.name}</strong><span>{item.car}</span></figcaption></figure>)}</div><Button label={c.trust.googleLabel} href={c.trust.googleHref}/></section>}
 {c.process.enabled&&<section className="container home-process"><Heading section={c.process}/><ol>{c.process.steps.map((item,i)=><li key={item.id||i}><span>{String(i+1).padStart(2,'0')}</span><h3>{item.title}</h3><p>{item.text}</p></li>)}</ol><Copy data={c.process.note} className="home-route-note"/><div className="home-guide-compact">{c.process.guide.map((item,i)=><details key={item.id||i}><summary>{item.title}</summary><Copy data={item.body}/></details>)}</div></section>}
 {c.services.enabled&&<section className="container home-services-compact"><Heading section={c.services}/><div className="home-service-cards">{c.services.items.map((item,i)=>{const href=homeLink(item.href);return href?<Link key={item.id||i} href={href}><h3>{item.title}<ArrowUpRight size={20}/></h3><p>{item.text}</p></Link>:<div key={item.id||i}><h3>{item.title}</h3><p>{item.text}</p></div>})}</div></section>}
 {c.dealers.enabled&&<section className="container home-dealers" id="dealers"><div><span className="eyebrow orange">{c.dealers.eyebrow}</span><h2><Lines text={c.dealers.title}/></h2><p>{c.dealers.description}</p><Button label={c.dealers.button} href={c.dealers.href} className="button button-dark"/></div><div><h3>{c.dealers.sideTitle}</h3><Copy data={c.dealers.sideBody}/><Button label={c.dealers.sideButton} href={c.dealers.sideHref}/></div></section>}
 {c.faq.enabled&&<section className="container home-faq" id="home-questions"><Heading section={c.faq}/><div className="faq-list">{c.faq.items.map((item,i)=><details key={item.id||i}><summary>{item.question}<span className="faq-plus" aria-hidden="true">+</span></summary><Copy data={item.answer}/></details>)}</div><Copy data={c.faq.more}/>{faqItems.length>0&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faqSchema).replace(/</g,'\\u003c')}}/>}</section>}
 {c.news.enabled&&<section className="container home-news"><Heading section={c.news}/><div className="home-news-grid">{articles.map(item=>{const cover=editorialImage(item.slug,mediaUrl(item.image),item.legacyImage);return <article key={item.id}>{cover.src&&<Link className="home-news-cover" href={'/'+item.slug} aria-label={item.title}><Image className="home-news-image" src={cover.src} width={640} height={360} sizes="(max-width:700px) 100vw,(max-width:1100px) 50vw,33vw" alt={imageAlt(item.image,cover.artwork?.alt||item.title)}/></Link>}<div className="home-news-copy"><h3><Link href={'/'+item.slug}>{item.title}</Link></h3><p>{item.intro}</p><Button label={c.news.readMore} href={'/'+item.slug}/></div></article>})}</div></section>}
 {c.community.enabled&&<section className="container home-community-compact"><div><span className="eyebrow orange">{c.community.eyebrow}</span><h2><Lines text={c.community.title}/></h2><p>{c.community.description}</p><Button label={c.community.button} href={c.community.href} className="button button-outline"/></div>{qr&&communityHref&&<a className="viber-qr" href={communityHref} target="_blank" rel="noopener noreferrer"><Image src={qr} width={140} height={140} alt={c.community.imageAlt}/></a>}</section>}
 {c.company.enabled&&<section className="container home-company"><Copy data={c.company.body}/></section>}
 {c.cta.enabled&&<section className="cta-section container"><div className="cta-box"><div><span className="eyebrow">{c.cta.eyebrow}</span><h2><Lines text={c.cta.title}/></h2><p>{c.cta.description}</p></div><Button label={c.cta.button} href={c.cta.href} className="button button-white"/><span className="cta-decoration" aria-hidden="true"><ArrowUpRight size={350} strokeWidth={0.6}/></span></div></section>}
 </div>
}
