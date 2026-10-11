import inventory from '../../content/legacy-archives.json'

export const legacyArchives = inventory.archives
export type LegacyArchive = (typeof legacyArchives)[number]
export const archivePagePath = (archive: LegacyArchive, page: number) =>
  archive.path + (page > 1 ? '/page/' + page : '')

export function resolveArchivePath(path: string) {
  const match = /^(\/(?:tag|category|author)\/[^/]+)(?:\/page\/([1-9]\d*))?$/.exec(path.replace(/\/$/, ''))
  if (!match) return undefined
  const archive = legacyArchives.find(item => item.path === match[1])
  const page = Number(match[2] || 1)
  if (!archive || !Number.isSafeInteger(page)) return undefined
  return { archive, page, canonical: archivePagePath(archive, page) }
}

export function archiveContains(archive: LegacyArchive, doc: { slug: string; sourceURL?: string | null }) {
  // sourceURL keeps archive membership stable if an editor changes the current slug.
  return archive.slugs.includes(doc.slug) || Boolean(doc.sourceURL && archive.sourceURLs.includes(doc.sourceURL))
}

export function archiveTitle(archive: LegacyArchive) {
  if (archive.kind === 'author') return 'Публикации от ' + archive.label
  if (archive.kind === 'category') return archive.label
  return 'Статии за ' + archive.label
}
