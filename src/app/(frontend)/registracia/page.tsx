import { CustomerAuth } from '@/components/CustomerAuth'
export const metadata = { title: 'Създай профил', robots: { index: false, follow: false } }
export default function Page() { return <CustomerAuth mode="register" /> }
