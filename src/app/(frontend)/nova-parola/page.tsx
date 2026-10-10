import { CustomerAuth } from '@/components/CustomerAuth'
export const metadata = { title: 'Нова парола', robots: { index: false, follow: false } }
export default function Page() { return <CustomerAuth mode="reset" /> }
