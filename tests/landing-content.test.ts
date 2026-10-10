import assert from 'node:assert/strict'
import test from 'node:test'
import { landingSections, nodeText } from '../src/lib/landing-content'
import type { Page } from '../src/payload-types'
const text = (value: string) => ({ type: 'text', version: 1, text: value })
test('landing layout retains content order, links and consecutive headings without changing the CMS document', () => {
 const body: NonNullable<Page['body']> = { root: { type: 'root', version: 1, direction: 'ltr', format: '', indent: 0, children: [
  { type: 'paragraph', version: 1, children: [text('Introduction')] },
  { type: 'heading', tag: 'h2', version: 1, children: [text('First')] },
  { type: 'heading', tag: 'h2', version: 1, children: [text('Second')] },
  { type: 'paragraph', version: 1, children: [{ type: 'link', fields: { url: '/kontakti' }, children: [text('Contact')] }] },
  { type: 'heading', tag: 'h3', version: 1, children: [text('Subheading')] },
  { type: 'paragraph', version: 1, children: [text('Final paragraph')] },
 ] } }
 const before = JSON.stringify(body)
 const result = landingSections({ body, sections: [{ heading: 'From the editor', body: 'One\n\nTwo' }] })
 assert.deepEqual(result.map(s => s.title), ['В детайли', 'First', 'Second', 'From the editor'])
 assert.deepEqual(result.map(s => s.id), ['topic-1', 'topic-2', 'topic-3', 'topic-4'])
 assert.equal(nodeText(result[2].rich!.root), 'ContactSubheadingFinal paragraph')
 assert.equal(JSON.stringify(result[2].rich!.root.children[0]), JSON.stringify(body.root.children[3]))
 assert.deepEqual(result[3].paragraphs, ['One', 'Two'])
 assert.equal(JSON.stringify(body), before)
})
test('pages with only editor sections or without content remain valid', () => {
 assert.deepEqual(landingSections({ body: null, sections: [] }), [])
 assert.equal(landingSections({ sections: [{ heading: 'Process', body: 'Retained text' }] })[0].paragraphs![0], 'Retained text')
})
