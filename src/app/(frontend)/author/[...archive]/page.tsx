import { LegacyArchivePage, legacyArchiveMetadata } from '@/components/LegacyArchivePage'
type Props = { params: Promise<{ archive: string[] }> }
export async function generateMetadata({ params }: Props) {
  return legacyArchiveMetadata('/author/' + (await params).archive.join('/'))
}
export default async function Page({ params }: Props) {
  return <LegacyArchivePage path={'/author/' + (await params).archive.join('/')} />
}
