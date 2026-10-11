import csv, json, time, re, os
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urljoin, urlsplit, urldefrag
from xml.etree import ElementTree
import requests
from bs4 import BeautifulSoup
BASE='https://koliotamerika.bg'
OUT='seo-audit'
os.makedirs(OUT,exist_ok=True)
def fetch(url):
    start=time.monotonic()
    try:
        r=requests.get(url,timeout=25,headers={'User-Agent':'Mozilla/5.0 (compatible; SiteOwnerSEOAudit/1.0)'})
        return {'url':url,'final':r.url,'status':r.status_code,'redirects':[{'status':p.status_code,'url':p.url,'to':p.headers.get('Location')} for p in r.history],'seconds':round(time.monotonic()-start,3),'headers':{k:v for k,v in r.headers.items() if k.lower() in ['content-type','x-robots-tag','link','cache-control','server']},'text':r.text}
    except Exception as ex:
        return {'url':url,'status':0,'error':str(ex),'text':''}
checks=[BASE+'/robots.txt',BASE+'/sitemap.xml',BASE+'/sitemap_index.xml',BASE+'/wp-sitemap.xml','http://koliotamerika.bg/','https://www.koliotamerika.bg/','https://papayawhip-ram-220810.hostingersite.com/robots.txt','https://papayawhip-ram-220810.hostingersite.com/sitemap.xml']
responses=list(ThreadPoolExecutor(max_workers=3).map(fetch,checks))
technical=[{**r,'text':r['text'][:20000]} for r in responses]
urls={BASE+'/',BASE+'/blog/',BASE+'/targove/',BASE+'/kontakti/'}
snapshot=json.load(open('content/wordpress.json'))
urls.update(x['sourceURL'] for x in snapshot['items'] if x.get('sourceURL'))
sitemaps={}
queue=[r for r in responses if '.xml' in r['url'] and urlsplit(r['url']).netloc=='koliotamerika.bg']
for _ in range(20):
    if not queue:break
    r=queue.pop(0)
    if r['url'] in sitemaps:continue
    try:
        root=ElementTree.fromstring(r['text'])
        locs=[e.text for e in root.iter() if e.tag.endswith('}loc') or e.tag=='loc']
        sitemaps[r['url']]={'status':r['status'],'root':root.tag,'locations':locs}
        if root.tag.endswith('sitemapindex'):
            queue.extend(fetch(u) for u in locs[:12] if urlsplit(u).netloc=='koliotamerika.bg')
        else:urls.update(locs)
    except Exception:pass
wp=[]
for kind in ['pages','posts']:
    for page in range(1,6):
        r=fetch(BASE+'/wp-json/wp/v2/'+kind+'?per_page=100&page='+str(page)+'&_fields=id,link,slug,date,modified,title,yoast_head_json')
        try:
            data=json.loads(r['text'])
            if not isinstance(data,list):break
            wp.extend(data);urls.update(x['link'] for x in data if x.get('link'))
            if len(data)<100:break
        except Exception:break
json.dump(wp,open(OUT+'/wordpress-public-inventory.json','w'),ensure_ascii=False,indent=2)
def eligible(u):
    p=urlsplit(u)
    return p.netloc=='koliotamerika.bg' and not p.query and not re.search(r'\.(jpg|png|webp|svg|pdf|xml|zip|jpeg|gif)$',p.path,re.I) and not any(t in p.path for t in ['/wp-admin','/wp-json','/wp-content','/feed/','/wp-login'])
urls={urldefrag(u)[0] for u in urls if eligible(u)}
def audit(url):
    r=fetch(url);s=BeautifulSoup(r['text'],'html.parser')
    def meta(key):return [x.get('content','') for x in s.select('meta[name="'+key+'"],meta[property="'+key+'"]')]
    def txt(el):return re.sub(r'\s+',' ',el.get_text(' ',strip=True)).strip()
    types=[]
    def walk(x):
        if isinstance(x,dict):
            if '@type' in x:types.extend(x['@type'] if isinstance(x['@type'],list) else [x['@type']])
            for v in x.values():walk(v)
        elif isinstance(x,list):
            for v in x:walk(v)
    schemaerrors=0
    for el in s.select('script[type="application/ld+json"]'):
        try:walk(json.loads(el.get_text()))
        except Exception:schemaerrors+=1
    links=sorted(set(urldefrag(urljoin(r.get('final',url),a['href']))[0] for a in s.select('a[href]') if a['href'].startswith(('http','/'))))
    headings={tag:[txt(x) for x in s.select(tag)] for tag in ['h1','h2','h3']}
    imgs=s.select('img')
    main=BeautifulSoup(str(s.select_one('main') or s.select_one('article') or s.body or s),'html.parser')
    for el in main.select('script,style,nav,header,footer'):el.decompose()
    body=txt(main)
    row={k:v for k,v in r.items() if k!='text'}
    row.update(title=txt(s.title) if s.title else '',description=meta('description'),robots=meta('robots'),canonical=[x.get('href') for x in s.select('link[rel="canonical"]')],lang=s.html.get('lang','') if s.html else '',**headings,og_image=meta('og:image'),schema=sorted(set(types)),schema_errors=schemaerrors,words=len(body.split()),images=len(imgs),missing_alt=sum(1 for x in imgs if not x.has_attr('alt')),empty_alt=sum(1 for x in imgs if not x.get('alt')),links=links,excerpt=body[:800],published=meta('article:published_time'),modified=meta('article:modified_time'),wordpress='wp-content' in r['text'],bytes=len(r['text'].encode()))
    row['title_chars']=len(row['title'])
    row['description_chars']=[len(x) for x in row['description']]
    filename=re.sub('[^a-zA-Z0-9_-]','_',url.replace(BASE,''))[:180] or 'home'
    open(OUT+'/'+filename+'.txt','w').write(body)
    return row
rows=[]
visited=set()
for batchnum in range(3):
    pending=sorted(urls-visited)[:max(0,160-len(visited))]
    if not pending:break
    for row in ThreadPoolExecutor(max_workers=3).map(audit,pending):
        rows.append(row);visited.add(row['url'])
        print('SEO_ROW:'+json.dumps(row,ensure_ascii=False),flush=True)
        urls.update(u for u in row['links'] if eligible(u))
    if len(visited)>=160:break
# Test a missing path and a filtered listing separately; do not crawl the auction inventory.
for u in [BASE+'/seo-audit-not-a-real-page-20261011/',BASE+'/targove/?make=BMW',BASE+'/blog/page/2/']:
    row=audit(u);rows.append(row);print('SEO_ROW:'+json.dumps(row,ensure_ascii=False),flush=True)
json.dump({'checked_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'technical':technical,'sitemaps':sitemaps,'rows':rows,'remaining':sorted(urls-visited)},open(OUT+'/audit.json','w'),ensure_ascii=False,indent=2)
cols=['url','status','final','title','title_chars','description','description_chars','h1','h2','robots','canonical','schema','words','images','missing_alt','empty_alt','seconds','bytes']
with open(OUT+'/pages.csv','w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=cols);w.writeheader()
    for row in rows:w.writerow({k:json.dumps(row.get(k),ensure_ascii=False) if isinstance(row.get(k),(list,dict)) else row.get(k,'') for k in cols})
print('SEO_TECHNICAL:'+json.dumps(technical,ensure_ascii=False))
print('SEO_SITEMAPS:'+json.dumps(sitemaps,ensure_ascii=False))
print('SEO_COVERAGE:'+json.dumps({'pages':len(rows),'remaining':sorted(urls-visited),'wp_items':len(wp)},ensure_ascii=False))
