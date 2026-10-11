import type { Payload } from 'payload'
import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'
import drafts from '../../content/editorial-drafts.json'
export async function importEditorialDrafts(payload: Payload) {
 let editorConfig: Awaited<ReturnType<typeof editorConfigFactory.default>> | undefined
 let count = 0
 for (const item of drafts) {
  const exists = async () => (await payload.count({ collection: 'pages', where: { slug: { equals: item.slug } } })).totalDocs > 0
  if (await exists()) continue
  editorConfig ??= await editorConfigFactory.default({ config: payload.config })
  const body = convertHTMLToLexical({ editorConfig, html: item.html, JSDOM })
  try {
   await payload.create({ collection: 'pages', data: {
    title: item.title, slug: item.slug, intro: item.intro, seo: item.seo,
    body, kind: 'article', status: 'draft', sections: [],
   } })
   count++
  } catch (error) {
   // Concurrent cold starts may insert the same unique slug; never overwrite it.
   if (!(await exists())) throw error
  }
 }
 return count
}
