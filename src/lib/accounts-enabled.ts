import { isPreview } from './preview'
export const accountsEnabled = () => !isPreview() && process.env.CUSTOMER_ACCOUNTS_ENABLED === 'true' && Boolean(process.env.DATABASE_URI)
export const passwordRecoveryEnabled = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM)
