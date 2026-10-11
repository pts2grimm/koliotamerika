import { LegacyArchivePage, legacyArchiveMetadata } from '@/components/LegacyArchivePage'
type Props = { params: Promise<{ archive: string[] }> }
export async function generateMetadata({ params }: Props) {
  return legacyArchiveMetadata('/category/' + (await params).archive.join('/'))
}
export default async function Page({ params }: Props) {
  return <LegacyArchivePage path={'/category/' + (await params).archive.join('/')} />
}
