import type { Page } from '@/payload-types'
type Body = NonNullable<Page['body']>
type Node = Body['root']['children'][number]
export type LandingSection = { id: string; title: string; rich?: Body; paragraphs?: string[] }
export function nodeText(value: unknown): string {
 if (!value || typeof value !== 'object') return ''
 const node = value as { text?: unknown; type?: string; children?: unknown[] }
 if (typeof node.text === 'string') return node.text
 if (node.type === 'linebreak') return ' '
 return (node.children || []).map(nodeText).join('')
}
/** A presentation-only split: retain every body node and CMS section in order. */
export function landingSections(page: Pick<Page, 'body' | 'sections'>): LandingSection[] {
 const sections: LandingSection[] = []
 if (page.body) {
  const body = page.body
  let title: string | null = null
  let nodes: Node[] = []
  const flush = () => {
   if (!nodes.length && title === null) return
   sections.push({ id: 'topic-' + (sections.length + 1), title: title ?? 'В детайли', rich: { ...body, root: { ...body.root, children: nodes } } })
   nodes = []
  }
  for (const node of body.root.children) {
   if (node.type === 'heading' && node.tag === 'h2' && nodeText(node).trim()) {
    flush()
    title = nodeText(node).trim()
   } else nodes.push(node)
  }
  flush()
 }
 for (const section of page.sections || []) {
  sections.push({ id: 'topic-' + (sections.length + 1), title: section.heading, paragraphs: section.body.split(/\n\s*\n/) })
 }
 return sections
}
