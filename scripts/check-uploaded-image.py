"""Read-only check of the test upload supplied by its owner."""
import requests, json, time
from io import BytesIO
from PIL import Image
base='https://papayawhip-ram-220810.hostingersite.com'
url=base+'/api/media/file/IMG_6961.JPEG'
headers={'Cache-Control':'no-cache','Pragma':'no-cache','User-Agent':'OwnerUploadVerification/1.0'}
for path in [url, url+'?upload_check='+str(time.time_ns())]:
 r=requests.get(path,headers=headers,timeout=30)
 result={'url':path,'status':r.status_code,'final':r.url,'bytes':len(r.content),'headers':{k:v for k,v in r.headers.items() if k.lower() in ['content-type','cache-control','age','x-hcdn-cache-status','last-modified']}}
 if r.status_code==200 and r.headers.get('Content-Type','').startswith('image/'):
  image=Image.open(BytesIO(r.content)); image.load()
  result['image']={'format':image.format,'dimensions':image.size}
 else:
  result['response']=r.text[:400]
 print(json.dumps(result,ensure_ascii=False))
r=requests.get(base+'/api/media/1',headers=headers,timeout=30)
result={'mediaRecordStatus':r.status_code}
if r.status_code==200:
 d=r.json();result['record']={k:d.get(k) for k in ['id','filename','url','mimeType','filesize','width','height','createdAt','updatedAt']}
print(json.dumps(result,ensure_ascii=False))
