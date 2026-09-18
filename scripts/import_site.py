#!/usr/bin/env python3
"""Explicit, reviewable snapshot import; never runs as part of deployment."""
from bs4 import BeautifulSoup, Comment
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import urlopen, Request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageOps
import hashlib, io, json, re

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://cpslab.hanyang.ac.kr/'
CACHE = Path('/tmp/cps-source-cache')
CACHE.mkdir(exist_ok=True)
assets, failures = {}, []

def fetch(url):
    key = CACHE / hashlib.sha256(url.encode()).hexdigest()
    if not key.exists():
        with urlopen(Request(url, headers={'User-Agent': 'CPSLAB website migration'}), timeout=45) as r:
            key.write_bytes(r.read())
    return key.read_bytes()

def soup(path):
    return BeautifulSoup(fetch(urljoin(BASE,path)), 'html.parser')

def text(node):
    return re.sub(r'\s+', ' ', node.get_text(' ', strip=True)).strip() if node else ''

def asset(src, page, label=''):
    url = urljoin(urljoin(BASE,page),src)
    if url in assets:return assets[url]
    filename = hashlib.sha256(url.encode()).hexdigest()[:16]
    try:
        data=fetch(url)
        im=ImageOps.exif_transpose(Image.open(io.BytesIO(data)))
        im.thumbnail((1600,1600))
        if im.mode not in ('RGB','RGBA'):im=im.convert('RGBA' if 'transparency' in im.info else 'RGB')
        out = '/assets/media/'+filename+'.webp'
        (ROOT/'assets/media').mkdir(exist_ok=True,parents=True)
        im.save(ROOT/out.lstrip('/'),'WEBP',quality=84)
        result={'src':out,'width':im.width,'height':im.height,'alt':label}
    except Exception as e:
        failures.append({'url':url,'error':str(e)})
        result=None
    assets[url]=result
    return result

def clean(node,page):
    """Allow only document markup; remove old scripts, styles and layout."""
    fragment=BeautifulSoup(node.decode_contents() if node.name in ('td','th') else str(node),'html.parser')
    for c in fragment.find_all(string=lambda s:isinstance(s,Comment)):c.extract()
    for tag in list(fragment.find_all(True)):
        if tag.name in ('script','style','iframe','input','button'):tag.decompose();continue
        if tag.name=='img':
            a=asset(tag.get('src',''),page,tag.get('alt','') or 'Research illustration')
            if a:
                tag.attrs={**a,'loading':'lazy','decoding':'async'}
            else:tag.decompose()
            continue
        if tag.name=='a':
            href=urljoin(urljoin(BASE,page),tag.get('href',''))
            if href.startswith(BASE):
                local='/'+href[len(BASE):]
                parsed=urlparse(local)
                known=re.fullmatch(r'/(?:|members/?|research(?:/(?:systemsoftware|realtimecomputing|servertechnology))?/?|publications/?|projects/?|courses(?:/os2019)?/?|albums(?:/\d+)?/?)',parsed.path)
                if known:
                    href=parsed.path.rstrip('/')+'/'
                    if parsed.fragment:href+='#'+parsed.fragment
            tag.attrs={'href':href};continue
        tag.attrs={}
        if tag.name not in ('p','br','em','strong','b','i','ul','ol','li','h2','h3','h4','h5','h6','hr','table','thead','tbody','tr','td','th','sup','sub','blockquote'):
            tag.unwrap()
    return re.sub(r'\s+',' ',str(fragment)).strip()

def table_groups(s,page):
    result=[]
    for pane in s.select('.tab-pane'):
        table=pane.find('table')
        if not table:continue
        # Pair cells, including orphan cells caused by missing <tr> in source.
        cells=table.select('tbody td')
        step = 3 if page == 'courses/' else 2
        assert len(cells)%step==0,(page,len(cells))
        rows=[{'label':text(cells[i]),'html':clean(cells[i+1],page),'text':text(cells[i+1])} for i in range(0,len(cells),step)]
        result.append({'id':pane.get('id'),'title':text(pane.find('abbr')),'items':rows})
    return result

def main():
    pages=['','members/','research/','publications/','projects/','courses/','albums/']
    with ThreadPoolExecutor(max_workers=5) as pool:ss=list(pool.map(soup,pages))
    home,members,research,pubs,projects,courses,albums=ss
    data={'source':BASE,'snapshot_date':'2026-09-17'}
    data['announcements']=[]
    for h in home.select('h5'):
        t=text(h)
        if t.startswith('['):
            p=h.find_next_sibling()
            data['announcements'].append({'title':t,'body':text(p)})
    data['publications']=table_groups(pubs,'publications/')
    data['projects']=table_groups(projects,'projects/')
    data['courses']=table_groups(courses,'courses/')
    data['faculty']=[]
    for section in members.select('section'):
        name=section.find('h3')
        if not name:continue
        image=section.find('img')
        intro=section.select_one('.col-md-6')
        career=section.select_one('.col-md-18')
        data['faculty'].append({'name':text(name),'korean':text(section.find('h4')),'photo':asset(image['src'],'members/',text(name)), 'bio':clean(intro,'members/').replace('alt="Research illustration"','alt="Email address for '+text(name)+'"'),'career':clean(career,'members/')})
    data['people']=[]
    for heading in members.select('h2'):
        container=heading.find_parent(class_='container')
        people=[]
        for desc in container.select('.image-box-description'):
            card=desc.parent
            photo=card.select_one('.image-box img')
            emails=[asset(x['src'],'members/','Email address for '+text(desc.find('h4'))) for x in desc.select('img')]
            paragraphs=[text(p) for p in desc.select('p') if text(p) and text(p)!='-']
            people.append({'name':text(desc.find('h4')),'details':paragraphs,'photo':asset(photo['src'],'members/',text(desc.find('h4'))) if photo else None,'emails':[a for a in emails if a],'links':[{'label':text(a),'href':a['href']} for a in desc.select('a[href]')]})
        data['people'].append({'title':text(heading),'items':people})
    data['areas']=[{'title':text(box.find('h3')),'description':text(box.find('p'))} for box in research.select('.icon-box')]
    data['research']=[]
    for card in research.select('.post-item'):
        link=card.select_one('h3 a')
        path=link['href'].strip('/')+'/'
        detail=soup(path)
        sections=[s for s in detail.select('section') if s.get('id')!='page-title']
        data['research'].append({'title':text(link),'path':'/'+path,'subtitle':text(card.select_one('.post-autor')),'summary':text(card.select_one('.post-description p')),'photo':asset(card.find('img')['src'],'research/',text(link)),'html':''.join(clean(s,path) for s in sections)})
    data['albums']=[]
    for card in albums.select('.portfolio-item'):
        print('Import album:',text(card.select_one('.title')),flush=True)
        path='albums/'+card.find('a')['href'].strip('/')+'/'
        detail=soup(path)
        title=text(card.select_one('.title'))
        photos=[]
        # Detail galleries use .slide img. Deduplicate original image references.
        sections=[s for s in detail.select('section') if s.get('id')!='page-title']
        seen=set()
        for section in sections:
            for img in section.select('img'):
                url=urljoin(urljoin(BASE,path),img.get('src',''))
                if url in seen:continue
                seen.add(url)
                a=asset(img.get('src',''),path,title)
                if a:photos.append(a)
        cover=asset(card.find('img')['src'],'albums/',title)
        if not photos and cover:photos=[cover]
        data['albums'].append({'title':title,'path':'/'+path,'category':text(card.select_one('.portfolio-description p')),'date':text(card.select_one('.portfolio-date')),'cover':cover,'photos':photos,'description':' '.join(text(s) for s in sections)})
    course=soup('courses/os2019/')
    data['course_detail']={'path':'/courses/os2019/','title':'Operating Systems · Spring 2019','html':''.join(clean(s,'courses/os2019/') for s in course.select('section') if s.get('id')!='page-title')}
    data['assets']=assets
    data['import_failures']=failures
    (ROOT/'content/site.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'people':[(g['title'],len(g['items'])) for g in data['people']],'publications':[(g['title'],len(g['items'])) for g in data['publications']],'projects':[(g['title'],len(g['items'])) for g in data['projects']],'albums':len(data['albums']),'assets':len(assets),'failures':failures},ensure_ascii=False,indent=2))

if __name__=='__main__':main()
