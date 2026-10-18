import config from '@payload-config'
import '@payloadcms/next/css'
import '../../components/admin/content.scss'
import '../../components/admin/overview.scss'
import '../../components/admin/navigation.scss'
import '../../components/admin/bos.scss'
import '../../components/admin/catalog-activity.scss'
import { RootLayout, handleServerFunctions } from '@payloadcms/next/layouts'
import type { ServerFunctionClient } from 'payload'
import { importMap } from './admin/importMap'
const serverFunction: ServerFunctionClient = async (args) => {
  'use server'
  return handleServerFunctions({ ...args, config, importMap })
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>{children}</RootLayout>
}
