import { CustomerAuth } from '@/components/CustomerAuth'
export const metadata = { title: 'Забравена парола', robots: { index: false, follow: false } }
export default function Page() { return <CustomerAuth mode="forgot" /> }
