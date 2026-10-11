"""HEAD-only verification of old media paths and sitemap endpoints."""
import json, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import requests
ROOT='https://koliotamerika.bg'
PREVIEW='https://papayawhip-ram-220810.hostingersite.com'
data=json.loads(Path('reports/url-migration-2026-10-11/verification.json').read_text())
def head(url):
    try:
        r=requests.head(url,timeout=20,allow_redirects=True,headers={'User-Agent':'Mozilla/5.0 (compatible; OwnerMigrationAudit/1.0)'})
        return {'status':r.status_code,'final':r.url,'type':r.headers.get('Content-Type','')}
    except requests.RequestException as err:return {'status':0,'error':str(err)}
def check(row):
    result={'oldURL':row['oldURL'],'old':head(row['oldURL']),'previewOldPath':head(row['oldURL'].replace(ROOT,PREVIEW,1)),'matchingImportedCover':row['matchingImportedCover']}
    if row['matchingImportedCover']:result['previewCover']=head(PREVIEW+row['matchingImportedCover'])
    return result
with ThreadPoolExecutor(max_workers=3) as pool:
    rows=list(pool.map(check,data['media']))
for row in rows:print('RESOURCE_ROW:'+json.dumps(row,ensure_ascii=False),flush=True)
for path in ['/robots.txt','/sitemap.xml','/sitemap_index.xml','/post-sitemap.xml','/page-sitemap.xml','/category-sitemap.xml','/post_tag-sitemap.xml','/author-sitemap.xml','/wp-sitemap.xml']:
    print('TECHNICAL_ROW:'+json.dumps({'path':path,'old':head(ROOT+path),'preview':head(PREVIEW+path)},ensure_ascii=False),flush=True)
print('RESOURCE_SUMMARY:'+json.dumps({'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'media':len(rows),'oldNon200':sum(x['old']['status']!=200 for x in rows),'previewOldNon200':sum(x['previewOldPath']['status']!=200 for x in rows),'coverNon200':sum(x.get('previewCover',{}).get('status',200)!=200 for x in rows)}),flush=True)
