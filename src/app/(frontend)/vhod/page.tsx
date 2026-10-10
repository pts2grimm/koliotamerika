import { CustomerAuth } from '@/components/CustomerAuth'
export const metadata = { title: 'Вход', robots: { index: false, follow: false } }
export default function Page() { return <CustomerAuth mode="login" /> }
