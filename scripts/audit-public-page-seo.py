"""Read only public SEO inventory of the deployed preview."""
import json,re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from collections import defaultdict
from datetime import datetime,timezone
import requests
from bs4 import BeautifulSoup
BASE='https://papayawhip-ram-220810.hostingersite.com'
HEADERS={'User-Agent':'Twitterbot/1.0 OwnerSEOAudit'}
docs=[]
for page in range(1,10):
 r=requests.get(BASE+'/api/pages',params={'limit':100,'page':page,'depth':0},headers=HEADERS,timeout=30);r.raise_for_status();data=r.json();docs.extend(data['docs'])
 if not data.get('hasNextPage'):break
paths={('/'+d['slug']):d for d in docs}
for p in ['/','/blog','/targove','/avtomobili','/kalkulator','/kontakti']:paths.setdefault(p,{})
def scan(pair):
 path,doc=pair
 try:
  r=requests.get(BASE+path,headers=HEADERS,timeout=35)
  s=BeautifulSoup(r.text,'html.parser');main=s.find('main') or s
  desc=s.find('meta',attrs={'name':'description'})
  canonical=s.find('link',rel='canonical')
  h1=[x.get_text(' ',strip=True) for x in main.find_all('h1')]
  h2=[x.get_text(' ',strip=True) for x in main.find_all('h2')]
  schemas=[]
  def types(x):
   if isinstance(x,dict):
    if '@type' in x: schemas.append(x['@type'])
    for v in x.values():types(v)
   elif isinstance(x,list):
    for v in x:types(v)
  for tag in s.find_all('script',type='application/ld+json'):
   try:types(json.loads(tag.string or tag.get_text()))
   except Exception:schemas.append('INVALID_JSON')
  for tag in main.find_all(['script','style']):tag.decompose()
  images=main.find_all('img')
  return {'path':path,'status':r.status_code,'kind':doc.get('kind','route'),'title':s.title.get_text() if s.title else '', 'description':desc.get('content') if desc else '', 'h1':h1,'h2':h2[:15],'words':len(re.findall(r'\w+',main.get_text(' ',strip=True))), 'canonical':canonical.get('href') if canonical else None,'schemaTypes':schemas, 'imagesWithoutAlt':sum(not x.has_attr('alt') for x in images),'imagesEmptyAlt':sum(x.get('alt')=='' for x in images),'internalLinks':sorted(set(a.get('href') for a in main.find_all('a',href=True) if a['href'].startswith('/'))),'seo':doc.get('seo',{}),'publishedAt':doc.get('publishedAt')}
 except Exception as e:return {'path':path,'error':str(e)}
with ThreadPoolExecutor(max_workers=3) as pool:rows=list(pool.map(scan,paths.items()))
duplicates={}
for field in ['title','description']:
 groups=defaultdict(list)
 for x in rows:
  if x.get(field):groups[x[field]].append(x['path'])
 duplicates[field]={k:v for k,v in groups.items() if len(v)>1}
report={'checkedAt':datetime.now(timezone.utc).isoformat(),'rows':rows,'duplicates':duplicates}
Path('seo-audit').mkdir(exist_ok=True);Path('seo-audit/pages.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'checkedAt':report['checkedAt'],'count':len(rows),'duplicates':duplicates,'rows':[{k:v for k,v in x.items() if k!='internalLinks'} for x in rows]},ensure_ascii=False,indent=2))
