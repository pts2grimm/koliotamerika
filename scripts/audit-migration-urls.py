"""Read-only URL mapping for the WordPress -> Next/Payload migration.
Never publishes content or changes either site's database.
"""
import csv, json, os, re, time
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
from pathlib import Path
import requests

ROOT = 'https://koliotamerika.bg'
PREVIEW = 'https://papayawhip-ram-220810.hostingersite.com'
OUT = Path('url-audit')
OUT.mkdir(exist_ok=True)
snapshot = json.loads(Path('content/wordpress.json').read_text())
evidence = json.loads(Path('reports/url-migration-2026-10-11/source-inventory.json').read_text())
static = json.loads(Path('content/legacy-redirects.json').read_text())
static.update({'/za-nas':'/amerikanski-sajt-za-koli','/poveritelnost':'/zashtita-na-lichni-danni','/blagodarim-vi':'/kontakti'})
known = {'/'+item['slug']:item for item in snapshot['items']}
routes = {'/', '/blog', '/targove', '/targove/kola', '/kontakti', '/kalkulator', '/avtomobili'}
def normalized(path):
    return path.rstrip('/') or '/'
class Meta(HTMLParser):
    def __init__(self):
        super().__init__(); self.canonical=[]; self.robots=[]; self.title=''; self.in_title=False
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='link' and a.get('rel')=='canonical': self.canonical.append(a.get('href',''))
        if tag=='meta' and a.get('name')=='robots': self.robots.append(a.get('content',''))
        if tag=='title': self.in_title=True
    def handle_endtag(self, tag):
        if tag=='title': self.in_title=False
    def handle_data(self, data):
        if self.in_title:self.title+=data
def get(url):
    try:
        r=requests.get(url,timeout=25,headers={'User-Agent':'Mozilla/5.0 (compatible; OwnerMigrationAudit/1.0)'})
        meta=Meta()
        if 'text/html' in r.headers.get('Content-Type',''):meta.feed(r.text)
        return {'status':r.status_code,'final':r.url,'hops':[{'status':h.status_code,'from':h.url,'to':h.headers.get('Location')} for h in r.history],
            'canonical':meta.canonical,'robots':meta.robots,'xRobots':r.headers.get('X-Robots-Tag',''),'title':meta.title,'text':r.text}
    except requests.RequestException as err:return {'status':0,'error':str(err),'text':''}
def api(kind):
    results=[]
    for page in range(1,11):
        r=get(ROOT+'/wp-json/wp/v2/'+kind+'?per_page=100&page='+str(page))
        if r['status']!=200:raise RuntimeError('WordPress inventory unavailable: '+kind+' '+str(r['status']))
        data=json.loads(r['text'])
        results.extend(data)
        if len(data)<100:return results
    raise RuntimeError('Inventory pagination exceeded bound')
posts=api('posts'); pages=api('pages'); tags=api('tags'); categories=api('categories')
inventory=[]
for item in pages+posts:
    inventory.append({'id':item['id'],'url':item['link'],'slug':normalized(urlsplit(item['link']).path).lstrip('/'),
      'kind':'article' if item['type']=='post' else 'page','modified':item['modified'],'date':item['date'],
      'title':item['title']['rendered'],'tags':item.get('tags',[]),'categories':item.get('categories',[]),'author':item.get('author'),
      'images':[x.get('url') for x in item.get('yoast_head_json',{}).get('og_image',[])],
      'embeddedImages':sorted(set(unquote(u) for u in re.findall(r'https://koliotamerika.bg/wp-content/uploads/[^"<>\s]+',item['content']['rendered'])))})
terms={'tags':[{k:t.get(k) for k in ['id','slug','name','link','count']} for t in tags],
       'categories':[{k:t.get(k) for k in ['id','slug','name','link','count']} for t in categories]}
Path(OUT/'wordpress-inventory.json').write_text(json.dumps({'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'records':inventory,**terms},ensure_ascii=False,indent=2))
for item in inventory: print('WP_RECORD:'+json.dumps(item,ensure_ascii=False),flush=True)
print('WP_TERMS:'+json.dumps(terms,ensure_ascii=False),flush=True)
urls=sorted(set(evidence['urls']+[x['url'] for x in inventory]+[t['link'] for t in tags+categories]))
def map_url(url):
    parsed=urlsplit(url); path=normalized(parsed.path); query=parsed.query
    target=static.get(path,path)
    pagination=re.fullmatch('/blog/page/([1-9][0-9]*)',path)
    if pagination:target='/blog'+('' if pagination[1]=='1' else '?page='+pagination[1])
    if query and '?' not in target: target+='?'+query
    target_path=urlsplit(target).path
    archive=path.startswith(('/tag/','/category/','/author/'))
    if archive:action='REVIEW_ARCHIVE'; note='Preserve equivalent archive or choose a relevant replacement using membership and GSC. No blanket homepage/blog redirect.'
    elif path=='/targove/kola':action='DYNAMIC_TEMPLATE';note='Empty lot is not a content landing page. Real lot URLs require separate inventory.'
    elif path in static or pagination:action='PERMANENT_REDIRECT';note='Existing configured redirect; verify final destination and number of hops.'
    elif target_path in known or target_path in routes:action='KEEP_PATH';note='Preserve content path; trailing slash normalization is a permanent redirect.'
    else:action='REVIEW_MISSING';note='Not found in imported content or known application routes.'
    old=get(url);new=get(PREVIEW+target)
    source=get(PREVIEW+parsed.path+('?' + query if query else '')) if parsed.path+('?' + query if query else '')!=target else new
    return {'oldURL':url,'oldStatus':old['status'],'oldFinal':old.get('final',''),'action':action,
      'targetPath':target,'previewTargetStatus':new['status'],'previewSourceStatus':source['status'],
      'previewSourceFinal':source.get('final',''),'previewSourceHops':source.get('hops',[]),
      'previewCanonical':new.get('canonical',[]),'previewRobots':new.get('robots',[]),
      'previewXRobots':new.get('xRobots',''),'note':note,
      **({'error':new['error']} if new.get('error') else {})}
rows=[]
with ThreadPoolExecutor(max_workers=3) as pool:
    for row in pool.map(map_url,urls):
        rows.append(row);print('URL_ROW:'+json.dumps(row,ensure_ascii=False),flush=True)
fields=list(rows[0])
with open(OUT/'url-map.csv','w',encoding='utf-8-sig',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');writer.writeheader()
    for row in rows:writer.writerow({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(list,dict)) else v for k,v in row.items()})
media=sorted(set(u for u in evidence['sitemapURLs'] if '/wp-content/uploads/' in u))
covers={}
for item in inventory:
    imported=known.get('/'+item['slug'])
    if imported and imported.get('coverPath'):
        for image in item['images']:
            if image and urlsplit(image).netloc=='koliotamerika.bg':
                covers.setdefault(unquote(urlsplit(image).path),imported['coverPath'])
media_rows=[]
for url in media:
    path=unquote(urlsplit(url).path)
    media_rows.append({'oldURL':url,'matchingImportedCover':covers.get(path),'action':'MAP_EXISTING_COVER' if path in covers else 'PRESERVE_UPLOAD_REQUIRED'})
Path(OUT/'media-map.json').write_text(json.dumps(media_rows,ensure_ascii=False,indent=2))
print('MEDIA_MAP:'+json.dumps(media_rows,ensure_ascii=False),flush=True)
updated=[{'slug':i['slug'],'snapshotModified':known['/'+i['slug']].get('modified'),'liveModified':i['modified']} for i in inventory if '/'+i['slug'] in known and known['/'+i['slug']].get('modified')!=i['modified']]
missing=[i['slug'] for i in inventory if '/'+i['slug'] not in known and '/'+i['slug'] not in routes and '/'+i['slug'] not in static]
summary={'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'rows':len(rows),'wordpressRecords':len(inventory),
 'actions':{action:sum(r['action']==action for r in rows) for action in sorted(set(r['action'] for r in rows))},
 'previewNon200':sum(r['previewTargetStatus']!=200 for r in rows),'changedSinceImport':updated,'unmappedWordPressRecords':missing,
 'mediaURLs':len(media),'coverMatches':sum(bool(r['matchingImportedCover']) for r in media_rows),
 'gscAvailable':False,'limits':['No GSC traffic/backlink priority data.','Media mapping is based on sitemap image URLs, not a full uploads backup.','Preview reflects the deployed build and CMS, not necessarily the branch head.','No exhaustive auction or filtered URL inventory.']}
Path(OUT/'result.json').write_text(json.dumps({'summary':summary,'rows':rows,'media':media_rows},ensure_ascii=False,indent=2))
print('URL_SUMMARY:'+json.dumps(summary,ensure_ascii=False),flush=True)
