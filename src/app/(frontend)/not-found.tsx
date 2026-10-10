import Link from 'next/link'
export default function NotFound() { return <section className="empty-state container"><span className="eyebrow orange">404 · ДРУГА ПОСОКА</span><h1>Тази страница не е открита.</h1><p>Продължи към началната страница или разгледай автомобилите.</p><Link className="button button-dark" href="/">Към началото</Link></section> }
