// Presentation-only English variants; provider, account, pricing and persistence code stays shared.
// The AST transform never rewrites API keys, query values or runtime user/provider content.
import ts from 'typescript'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import path from 'node:path'
const files = [
  "src/components/Header.tsx",
  "src/components/Footer.tsx",
  "src/components/Tracking.tsx",
  "src/components/ThemeToggle.tsx",
  "src/components/MakeModelFields.tsx",
  "src/components/AuctionFilters.tsx",
  "src/components/FilterPanel.tsx",
  "src/components/AuctionSearchForm.tsx",
  "src/components/AuctionSort.tsx",
  "src/components/HomeSearch.tsx",
  "src/components/AuctionSchedule.tsx",
  "src/components/AuctionBuyNow.tsx",
  "src/components/CardPhotos.tsx",
  "src/components/VehicleGallery.tsx",
  "src/components/DetailTooltip.tsx",
  "src/components/SaveAuction.tsx",
  "src/components/ShareAuction.tsx",
  "src/components/CustomerAuth.tsx",
  "src/components/CustomerProfile.tsx",
  "src/components/SavedAuctions.tsx",
  "src/components/ImportCalculator.tsx",
  "src/components/InquiryForm.tsx",
  "src/components/AuctionCard.tsx",
  "src/components/AuctionCatalogue.tsx",
  "src/components/AuctionCatalogueLoading.tsx",
  "src/components/AuctionLink.tsx",
  "src/components/AuctionLinkPending.tsx",
  "src/components/LoadingIndicator.tsx",
  "src/components/AuctionQuote.tsx",
  "src/components/RelatedAuctions.tsx",
  "src/components/VehicleFacts.tsx",
  "src/lib/auction-filters.ts",
  "src/lib/auction-schedule.ts",
  "src/lib/auction-lifecycle.ts",
  "src/lib/vehicle-details.ts",
  "src/lib/currency.ts",
  "src/components/AuctionSEO.tsx",
  "src/components/PowersportsSEO.tsx",
  "src/components/VehicleSEO.tsx",
  "src/components/ArchivedVehicleSEO.tsx",
  "src/app/(frontend)/targove/kola/page.tsx"
]
const collect = process.argv.includes('--collect')
const messages = new Set()
for(const file of files) {
 const source=await readFile(file,'utf8')
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
 function visit(node) {
  if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)||ts.isTemplateHead(node)||ts.isTemplateMiddle(node)||ts.isTemplateTail(node)||ts.isJsxText(node)){
   const value=node.text
   if(/[\u0400-\u04ff]/.test(value))messages.add(ts.isJsxText(node)?value.trim():value)
  }
  ts.forEachChild(node,visit)
 }
 visit(ast)
}
console.log('EN_MESSAGES_START'+JSON.stringify([...messages].sort())+'EN_MESSAGES_END')
