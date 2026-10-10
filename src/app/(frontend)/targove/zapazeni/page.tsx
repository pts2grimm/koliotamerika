import { SavedAuctions } from '@/components/SavedAuctions'
export const metadata={title:'Запазени автомобили',robots:{index:false,follow:true}}
export default function Page(){return <section className="container blog-section"><div className="page-heading"><span className="eyebrow orange">ТВОЯТ ИЗБОР</span><h1>Струва си да ги запомниш.</h1><p>Запазените автомобили се пазят само в този браузър. Наличността и цените могат да се променят.</p></div><SavedAuctions/></section>}
