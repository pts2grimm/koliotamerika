import { JSDOM } from 'jsdom'
import snapshot from '../../content/wordpress.json'
import revisions from '../../content/content-review-2026-10.json'
import additions from '../../content/pricing-details-2026-10.json'
import { reviewedHTML, type ContentRevision } from './content-review'

export function pricingDetailsHTML(slug:string) {
 const addition=additions.find(item=>item.slug===slug)
 if(!addition) throw new Error('Missing pricing content: '+slug)
 if(addition.mode==='replace')return addition.html
 const original=snapshot.items.find(item=>item.slug===slug)!
 const revision=revisions.find(item=>item.slug===slug)! as ContentRevision
 const html=reviewedHTML(original.html,revision)
 const dom=new JSDOM(html)
 try{
  const headings=[...dom.window.document.querySelectorAll('h2,h3')]
  const target=headings.find(node=>node.textContent?.includes(addition.section!))
  if(!target)throw new Error('Pricing section not found: '+slug)
  // Keep the article's existing structure and edit its relevant section, rather
  // than appending an unrelated block after the conclusion.
  target.insertAdjacentHTML('afterend',addition.html)
  for(const a of dom.window.document.querySelectorAll('a[href]')){
   if(a.getAttribute('href')==='https://www.copart.com/content/us/en/member-fees-us-licensed'){
    a.setAttribute('href','https://www.copart.com/content/us/en/member-fees-us-non-licensed')
    a.textContent='тарифата на Copart за купувачи без лиценз'
   }
  }
  return dom.window.document.body.innerHTML
 }finally{dom.window.close()}
}
