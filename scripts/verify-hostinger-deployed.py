"""Read-only deployed Hostinger verification. No credentials, writes or form submissions."""
import json, hashlib, time
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from urllib.parse import urlsplit
import requests
from PIL import Image, ImageOps
from io import BytesIO

BASE = 'https://papayawhip-ram-220810.hostingersite.com'
class Meta(HTMLParser):
 def __init__(self):
  super().__init__(); self.canonical=[]; self.robots=[]; self.h1=0
 def handle_starttag(self, tag, attrs):
  a=dict(attrs)
  if tag=='link' and a.get('rel')=='canonical': self.canonical.append(a.get('href',''))
  if tag=='meta' and a.get('name')=='robots': self.robots.append(a.get('content',''))
  if tag=='h1': self.h1+=1
def get(path):
 for attempt in range(2):
  try:
   r=requests.get(BASE+path,timeout=30,headers={'User-Agent':'Twitterbot/1.0 OwnerMigrationVerification'})
   if r.status_code < 500: return r
  except requests.RequestException:
   if attempt==1: raise
  time.sleep(1)
 return r

baseline=json.loads(Path('reports/url-migration-2026-10-11/verification.json').read_text())
media=json.loads(Path('content/legacy-media.json').read_text())['records']
empty={'/tag/b58','/category/uncategorized'}
def page_check(row):
 path=urlsplit(row['oldURL']).path or '/'
 expected=404 if path.rstrip('/') in empty else 200
 try:
  r=get(path); m=Meta(); m.feed(r.text)
  errors=[]
  if r.status_code!=expected: errors.append('HTTP '+str(r.status_code)+' expected '+str(expected))
  if expected==200 and r.status_code==200:
   if 'noindex' not in ','.join(m.robots)+r.headers.get('X-Robots-Tag',''): errors.append('preview missing noindex')
   if not m.canonical and row['action']!='DYNAMIC_TEMPLATE': errors.append('missing canonical')
   if m.canonical and any(urlsplit(c).netloc != urlsplit(BASE).netloc for c in m.canonical): errors.append('unexpected canonical origin')
   if m.h1!=1: errors.append('h1 count '+str(m.h1))
  return {'path':path,'status':r.status_code,'final':r.url,'canonical':m.canonical,'robots':m.robots,'hops':[{'status':x.status_code,'to':x.headers.get('Location')} for x in r.history],'errors':errors}
 except Exception as e: return {'path':path,'errors':[str(e)]}
def image_check(item):
 path=urlsplit(item['sourceURL']).path
 try:
  r=get(path); digest=hashlib.sha256(r.content).hexdigest()
  errors=[]
  if r.status_code!=200: errors.append('HTTP '+str(r.status_code))
  same_pixels=None
  if not r.headers.get('Content-Type','').startswith('image/'): errors.append('not an image response')
  if digest!=item['sha256']:
   original=ImageOps.exif_transpose(Image.open(Path('public')/item['path'].lstrip('/'))).convert('RGBA')
   served=ImageOps.exif_transpose(Image.open(BytesIO(r.content))).convert('RGBA')
   same_pixels=original.size==served.size and original.tobytes()==served.tobytes()
   if not same_pixels: errors.append('decoded pixels differ from original')
  return {'path':path,'status':r.status_code,'bytes':len(r.content),'sha256':digest,'byteIdentical':digest==item['sha256'],'pixelsIdentical':same_pixels,'errors':errors}
 except Exception as e:return {'path':path,'errors':[str(e)]}
with ThreadPoolExecutor(max_workers=3) as pool:
 pages=list(pool.map(page_check,baseline['rows']))
 images=list(pool.map(image_check,media))
resources=[]
for path in ['/robots.txt','/sitemap.xml','/sitemap_index.xml','/wp-sitemap.xml','/post-sitemap.xml','/page-sitemap.xml','/category-sitemap.xml','/post_tag-sitemap.xml','/author-sitemap.xml','/admin/login']:
 try:
  r=get(path); resources.append({'path':path,'status':r.status_code,'final':r.url,'hops':[{'status':x.status_code,'to':x.headers.get('Location')} for x in r.history],'text':r.text[:1500] if path.endswith(('.xml','.txt')) else None})
 except Exception as e:resources.append({'path':path,'error':str(e)})
report={'checkedAt':datetime.now(timezone.utc).isoformat(),'base':BASE,'pages':pages,'images':images,'resources':resources}
Path('live-verification').mkdir(exist_ok=True)
Path('live-verification/hostinger.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
issues=[x for x in pages+images if x['errors']]
print(json.dumps({'checkedAt':report['checkedAt'],'pages':len(pages),'pagesWithoutIssues':sum(not x['errors'] for x in pages),'images':len(images),'imagesWithoutIssues':sum(not x['errors'] for x in images),'byteIdentical':sum(x.get('byteIdentical',False) for x in images),'pixelIdenticalWithDifferentEncoding':sum(x.get('pixelsIdentical') is True for x in images),'issues':issues,'resources':resources},ensure_ascii=False,indent=2))
if issues:raise SystemExit(1)
