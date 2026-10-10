import { RichText, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
import type { ComponentProps } from 'react'

type Node = { type: string; children?: Node[] }
const blockTypes = new Set(['heading', 'paragraph', 'list', 'quote', 'table', 'block', 'horizontalrule'])
function containsBlock(nodes: Node[]): boolean {
  return nodes.some(node => blockTypes.has(node.type) || containsBlock(node.children || []))
}

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  paragraph: args => {
    // Imported WordPress links can contain headings. A <p> cannot contain
    // those blocks: browsers close it early and break React hydration.
    if (containsBlock(args.node.children)) {
      return <div>{args.nodesToJSX({ nodes: args.node.children })}</div>
    }
    const paragraph = defaultConverters.paragraph
    return typeof paragraph === 'function' ? paragraph(args) : paragraph
  },
})

export function EditorialContent({ data }: Pick<ComponentProps<typeof RichText>, 'data'>) {
  return <RichText data={data} converters={converters} />
}
