#!/usr/bin/env python3
"""Build the complete GitHub Pages site from its reviewed content snapshot.
Python standard library only. No network or server runtime required.
"""
from pathlib import Path
from html import escape
import json, re

ROOT=Path(__file__).resolve().parents[1]
D=json.loads((ROOT/'content/site.json').read_text())
SITE='https://hy-cyber-physical-system.github.io'
NAV=[('Research','/research/'),('People','/members/'),('Publications','/publications/'),('Projects','/projects/'),('Courses','/courses/'),('Album','/albums/')]
PAGES=[]
MIGRATION=json.loads((ROOT/'content/migration.json').read_text())
UNAVAILABLE={r['url'] for r in MIGRATION['source_links'] if '404' in r.get('error','')}
e=lambda s:escape(str(s),quote=True)

def img(a,cls='',eager=False):
    if not a:return ''
    variants=[(w,a['src'].replace('.webp',f'-{w}.webp')) for w in (400,800) if (ROOT/a['src'].lstrip('/').replace('.webp',f'-{w}.webp')).exists()]
    responsive=(' srcset="'+', '.join(f'{url} {w}w' for w,url in variants+[(a['width'],a['src'])])+'" sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 600px"') if variants else ''
    return f'<img src="{e(a["src"])}" width="{a["width"]}" height="{a["height"]}" alt="{e(a["alt"])}" class="{e(cls)}" loading="{"eager" if eager else "lazy"}" decoding="async"'+(' fetchpriority="high"' if eager else '')+responsive+'>'

def link(label,url,cls='text-link'):
    return f'<a class="{cls}" href="{e(url)}">{e(label)} <span aria-hidden="true">↗</span></a>'

def header(path):
    items=''.join(f'<a href="{url}"'+(' aria-current="page"' if path.startswith(url) else '')+f'>{label}</a>' for label,url in NAV)
    return f'''<a class="skip" href="#main">Skip to content</a><header class="site-header"><div class="wrap header-inner"><a class="brand" href="/" aria-label="CPSLAB home"><span class="brand-mark" aria-hidden="true">CPS</span><span class="brand-name">CPSLAB<small>HANYANG UNIVERSITY</small></span></a><button type="button" class="nav-toggle" aria-controls="main-nav" aria-expanded="false">Menu</button><nav class="main-nav" id="main-nav" aria-label="Main navigation">{items}</nav></div></header>'''

FOOTER='''<footer class="site-footer"><div class="wrap footer-inner"><p>© 2026 CPSLAB · Hanyang University ERICA</p><div class="footer-links"><a href="/#contact">Contact</a><a href="https://www.hanyang.ac.kr/">Hanyang University</a><a href="https://github.com/HY-Cyber-Physical-System">GitHub</a></div></div></footer>'''

def page(path,title,description,body):
    for url in UNAVAILABLE:
        body=re.sub(r'<a href="'+re.escape(url)+r'"[^>]*>.*?</a>', '<span class="unavailable">Source PDF unavailable</span>', body)
    PAGES.append(path)
    target=ROOT/(path.strip('/')+'/index.html' if path!='/' else 'index.html')
    target.parent.mkdir(parents=True,exist_ok=True)
    full_title=f'{title} | CPSLAB · Hanyang University' if path!='/' else 'CPSLAB | Cyber-Physical Systems Laboratory · Hanyang University'
    target.write_text(f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#102b50"><title>{e(full_title)}</title><meta name="description" content="{e(description)}"><link rel="canonical" href="{SITE}{path}"><meta property="og:type" content="website"><meta property="og:title" content="{e(full_title)}"><meta property="og:description" content="{e(description)}"><meta property="og:url" content="{SITE}{path}"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/site.css"><script src="/assets/site.js" defer></script></head><body>{header(path)}<main id="main">{body}</main>{FOOTER}</body></html>\n''')

def heading(kicker,title,description):
    return f'<div class="page-heading"><div class="wrap"><div class="eyebrow">{e(kicker)}</div><h1>{e(title)}</h1><p>{e(description)}</p></div></div>'

def news(item):
    match=re.match(r'\[\s*(.*?)\s*\]\s*(.*)',item['title'])
    date,title=match.groups() if match else ('',item['title'])
    return f'<article class="news-card"><p class="news-date">{e(date.replace("/","."))}</p><h3>{e(title)}</h3><p>{e(item["body"])}</p></article>'

def research_cards():
    summaries=['Operating systems and I/O optimization, with caching and prefetching techniques for faster applications.','Real-time communication and computing for medical telemetry and multimedia systems.','Cloud computing, storage architectures, and low-power, large-scale storage systems.']
    return ''.join(f'<article class="research-card"><span class="research-number">0{i+1}</span><h3>{e(r["title"])}</h3><p>{summaries[i]}</p>{link("Explore research",r["path"])}</article>' for i,r in enumerate(D['research']))

cover=D['albums'][0]['cover']
body=f'''<section class="hero"><div class="wrap hero-grid"><div class="hero-copy"><div class="eyebrow">Hanyang University · ERICA</div><h1>Cyber-Physical<br>Systems<br><span>Laboratory.</span></h1><p>Connecting computing and the physical world through systems research.</p><div class="hero-actions">{link('Explore our research','/research/','button')}{link('Meet the people','/members/')}</div></div><figure class="hero-photo">{img(cover,eager=True)}<figcaption class="photo-caption"><span>Life at CPSLAB</span><span>GRADUATION · 2025</span></figcaption></figure></div></section>
<section class="intro-band"><div class="wrap intro-inner"><div class="eyebrow">Computing meets the physical world</div><p>Cyber-physical systems connect physical and engineered systems with computing and communication. We study the systems that make this connection possible—from operating systems and real-time computing to cloud and storage technologies.</p></div></section>
<section class="section"><div class="wrap"><div class="section-head"><div><div class="eyebrow">What we study</div><h2>Research areas</h2></div>{link('All research','/research/')}</div><div class="research-grid">{research_cards()}</div></div></section>
<section class="section soft"><div class="wrap"><div class="section-head"><div><div class="eyebrow">From the lab</div><h2>Latest news</h2></div></div><div class="news-grid">{''.join(news(n) for n in D['announcements'][:2])}</div><details class="news-archive"><summary>Earlier announcements</summary><div class="news-grid">{''.join(news(n) for n in D['announcements'][2:])}</div></details></div></section>
<section class="section"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Our work</div><h2>Recent publications</h2></div>{link('All publications','/publications/')}</div>{''.join('<article class="pub-preview"><span>2026</span><div>'+p['html']+'</div></article>' for p in D['publications'][0]['items'][:3])}</div></section>
<section class="affiliations" aria-label="Organizations"><div class="wrap"><span class="eyebrow">Organizations</span><div class="affiliation-links"><a href="https://www.hanyang.ac.kr">Hanyang University</a><a href="https://bkplus.nrf.re.kr">BK21</a><a href="https://linc.hanyang.ac.kr">LINC</a><a href="https://www.ieee.org">IEEE</a><a href="https://www.acm.org">ACM</a><a href="https://www.kiise.or.kr">KIISE</a><a href="https://www.itrc.or.kr">ITRC</a></div></div></section>
<section class="section contact-section" id="contact"><div class="wrap contact-grid"><div><div class="eyebrow">Visit & contact</div><h2>Find us at<br>Hanyang ERICA.</h2></div><div><address><p>Room 622, ERICA Support Center<br>Hanyang University ERICA Campus<br>55, Hanyangdaehak-ro, Sangrok-gu, Ansan-si,<br>Gyeonggi-do, 15588, South Korea</p><p lang="ko">경기도 안산시 상록구 한양대학로 55<br>한양대학교 ERICA 학연산클러스터 지원센터 622호</p></address><div class="contact-meta"><a href="tel:+82314004748">+82 31 400 4748</a><a href="https://www.google.com/maps/search/?api=1&query=Hanyang+University+ERICA+Support+Center">View on map ↗</a></div></div></div></section>'''
page('/','Home','Cyber-Physical Systems Laboratory at Hanyang University ERICA. Research, people, publications, projects, and news.',body)

# Shared archive layout retains the original anchors and every record.
def archive(kind,title,description,notice=''):
    groups=D[kind]
    jump='<nav class="jump-nav" aria-label="Page sections">'+''.join(f'<a href="#{e(g["id"])}">{e(g["title"])}</a>' for g in groups)+'</nav>'
    content=''
    for g in groups:
        records=''.join(f'<li class="record {"project-record" if kind!="publications" else ""}"><span class="record-label">{e(r["label"])}</span><div class="record-content">{r["html"]}</div></li>' for r in g['items'])
        content+=f'<section class="content-section" aria-labelledby="{e(g["id"])}"><h2 id="{e(g["id"])}">{e(g["title"])}<span class="count">{len(g["items"])}</span></h2><ol class="record-list">{records}</ol></section>'
    page('/'+kind+'/',title,description,heading('CPSLAB / '+title,title,description)+'<div class="wrap page-body">'+jump+(f'<p class="notice">{notice}</p>' if notice else '')+content+'</div>')
archive('publications','Publications','Journal articles, conference papers, patents, and registered software.','* denotes a corresponding author. Publication details follow the laboratory’s bibliography.')
archive('projects','Projects','Research collaborations across systems, artificial intelligence, healthcare, and security.','Project groupings follow the laboratory’s published list; each project’s period is shown below.')
archive('courses','Courses','Undergraduate and graduate courses taught by CPSLAB faculty.','Course archive · These listings cover 2011–2019. See the university course catalog for current offerings.')

# Faculty and member directory.
def person(p,alumni=False):
    photo=img(p['photo'],'person-photo') if p['photo'] else f'<div class="person-photo person-initial" aria-hidden="true">{e(p["name"][:1])}</div>'
    details=''.join(f'<p>{e(t)}</p>' for t in p['details'])
    emails=''.join(img(a,'email-image') for a in p['emails'])
    links=''.join(f'<p><a href="{e(a["href"])}">{e(a["label"] or "Personal website")}</a></p>' for a in p['links'])
    return f'<article class="person">{photo}<div><h3>{e(p["name"])}</h3>{details}{emails}{links}</div></article>'

body=heading('The people behind the research','People','Faculty, researchers, students, and alumni of CPSLAB.')+'<div class="wrap page-body"><nav class="jump-nav" aria-label="People groups"><a href="#faculty">Faculty</a>'+''.join(f'<a href="#{e(g["title"].lower())}">{e(g["title"])}</a>' for g in D['people'])+'</nav><section class="content-section"><h2 id="faculty">Faculty</h2>'
for f in D['faculty']:
    body+=f'<article class="faculty">{img(f["photo"],"faculty-portrait")}<div><h2>{e(f["name"])}</h2><p class="korean" lang="ko">{e(f["korean"])}</p><div class="faculty-bio">{f["bio"]}</div><details class="faculty-career"><summary>Career & experience</summary><div>{f["career"]}</div></details></div></article>'
body+='</section>'
for group in D['people']:
    alumni=group['title']=='Alumni'
    body+=f'<section class="content-section"><h2 id="{e(group["title"].lower())}">{e(group["title"])}<span class="count">{len(group["items"])}</span></h2><div class="{"alumni-list" if alumni else "people-grid"}">'+''.join(person(p,alumni) for p in group['items'])+'</div></section>'
page('/members/','People','Meet the faculty, researchers, students, and alumni of CPSLAB at Hanyang University.',body+'</div>')

# Research overview and full, locally served detail pages.
body=heading('Systems, from foundations to applications','Research','Our research connects systems software, real-time computing, and server technologies.')+'<div class="wrap page-body"><div class="areas-grid">'+''.join(f'<article class="area"><h3>{e(a["title"])}</h3><p>{e(a["description"])}</p></article>' for a in D['areas'])+'</div>'
for r in D['research']:
    body+=f'<article class="research-feature">{img(r["photo"])}<div><span class="eyebrow">{e(r["subtitle"])}</span><h2>{e(r["title"])}</h2><p>{e(r["summary"])}</p>{link("Read about this research",r["path"])}</div></article>'
    page(r['path'],r['title'],r['subtitle'],heading('CPSLAB / Research',r['title'],r['subtitle'])+f'<div class="wrap page-body"><a class="back-link" href="/research/">← All research</a><article class="prose">{r["html"]}</article></div>')
page('/research/','Research','Systems software, real-time computing, server technologies, and six core research areas at CPSLAB.',body+'</div>')

# Album listing and detail pages preserve every available photo.
categories=list(dict.fromkeys(a['category'] for a in D['albums']))
filters='<div class="jump-nav" id="album-filters" hidden aria-label="Album filters"><button class="filter-button" type="button" data-album-filter="all" aria-pressed="true">All albums</button>'+''.join(f'<button class="filter-button" type="button" data-album-filter="{e(c)}" aria-pressed="false">{e(c.title())}</button>' for c in categories)+'</div>'
body=heading('Life at CPSLAB','Album','Conferences, graduations, and moments together.')+'<div class="wrap page-body">'+filters+f'<p id="album-status" class="meta" role="status" style="margin-bottom:24px">{len(D["albums"])} albums</p><div class="gallery-grid">'
for a in D['albums']:
    body+=f'<a class="album-card" href="{a["path"]}" data-album-category="{e(a["category"])}">{img(a["cover"])}<span class="meta">{e(a["date"])}</span><h2>{e(a["title"])}</h2></a>'
    photos=''.join(f'<a href="{p["src"]}" aria-label="Open photo {i+1} of {e(a["title"])}">{img(p,eager=i==0)}</a>' for i,p in enumerate(a['photos']))
    page(a['path'],a['title'],a['date'],heading('CPSLAB / Album',a['title'],a['date'])+'<div class="wrap page-body"><a class="back-link" href="/albums/">← All albums</a>'+f'<div class="album-photos">{photos}</div></div>')
page('/albums/','Album','Conference photos, graduations, and everyday life at CPSLAB.',body+'</div></div>')
c=D['course_detail']
course_html=c['html'].replace('>Login</a>', '>Course website login ↗</a>')
page(c['path'],c['title'],'Course archive · Hanyang University',heading('CPSLAB / Courses',c['title'],'Course archive · Hanyang University')+f'<div class="wrap page-body"><a class="back-link" href="/courses/">← All courses</a><p class="notice">Course announcements and materials require a login on the original course website.</p><article class="prose">{course_html}</article></div>')
page('/404/','Page not found','This page could not be found.',heading('404','Page not found','The page may have moved. Explore the laboratory using the navigation above.')+'<div class="wrap page-body">'+link('Return home','/','button')+'</div>')
(ROOT/'404.html').write_text((ROOT/'404/index.html').read_text())
(ROOT/'404/index.html').unlink();(ROOT/'404').rmdir();PAGES.remove('/404/')
(ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(f'<url><loc>{SITE}{p}</loc></url>' for p in PAGES)+'</urlset>\n')
(ROOT/'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n')
print(f'Built {len(PAGES)} pages + 404.html')
