import artwork from '../../content/editorial-images.json'

// Presentation-only fallback: never write into CMS or replace an editor's image.
export function editorialImage(slug: string, uploaded?: string | null, legacy?: string | null) {
 if (uploaded || legacy) return { src: uploaded || legacy || undefined, artwork: undefined }
 const illustration = artwork.find(item => item.slug === slug)
 return { src: illustration?.src, artwork: illustration }
}
