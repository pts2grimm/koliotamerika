'use client'
export default function ErrorPage({ reset }: { reset: () => void }) { return <section className="empty-state container"><h1>Страницата не се зареди.</h1><p>Възникна временна грешка. Моля, опитай отново.</p><button className="button button-dark" onClick={reset}>Опитай отново</button></section> }
