import { RichText, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
import type { ComponentProps } from 'react'

type Node = { type: string; children?: Node[] }
const blockTypes = new Set(['heading', 'paragraph', 'list', 'quote', 'table', 'block', 'horizontalrule'])
function containsBlock(nodes: Node[]): boolean {
  return nodes.some(node => blockTypes.has(node.type) || containsBlock(node.children || []))
}

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  table: args => <div className="editorial-table-scroll" role="region" aria-label="Таблица с разбивка — превърти хоризонтално при нужда" tabIndex={0}><table><tbody>{args.nodesToJSX({nodes:args.node.children})}</tbody></table></div>,
  tablerow: args => <tr>{args.nodesToJSX({nodes:args.node.children})}</tr>,
  tablecell: args => {
    const node=args.node as typeof args.node & {headerState?:number;colSpan?:number;rowSpan?:number}
    const Cell=node.headerState?'th':'td'
    return <Cell colSpan={node.colSpan} rowSpan={node.rowSpan}>{args.nodesToJSX({nodes:node.children})}</Cell>
  },
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
