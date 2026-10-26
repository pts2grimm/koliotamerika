import type { Metadata } from 'next'
import '../../site-styles'
import '../../(frontend)/home-clarity.css'
import '../../(frontend)/home-editor.css'
import './preview.css'
import { requireHomePreviewAdmin } from '@/lib/home-preview-auth'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { HomePreviewShell } from '@/components/HomePreviewShell'
import { AccountProvider } from '@/components/AccountProvider'
import { auctionProviderName } from '@/lib/auctions'
import { themeInitScript } from '@/lib/theme'
export const dynamic='force-dynamic'
export const metadata:Metadata={title:'Преглед на началната страница',robots:{index:false,follow:false,noarchive:true}}
export default async function Layout({children}:{children:React.ReactNode}){
 await requireHomePreviewAdmin()
 return <html lang="bg" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeInitScript}}/></head><body><HomePreviewShell><AccountProvider enabled={false} recovery={false}><Header powersports={auctionProviderName()==='eridan'}/><main id="main">{children}</main><Footer/></AccountProvider></HomePreviewShell></body></html>
}
