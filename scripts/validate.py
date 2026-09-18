#!/usr/bin/env python3
"""Validate generated pages, local routes, fragment IDs, and media references."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json, re, sys
ROOT=Path(__file__).resolve().parents[1]
class Document(HTMLParser):
 def __init__(self):
  super().__init__();self.ids=set();self.links=[];self.errors=[];self.title=False;self.viewport=False;self.h1=0
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:
   if a['id'] in self.ids:self.errors.append('Duplicate ID: '+a['id'])
   self.ids.add(a['id'])
  if tag=='title':self.title=True
  if tag=='h1':self.h1+=1
  if tag=='meta' and a.get('name')=='viewport':self.viewport=True
  if tag=='img' and (not a.get('alt') or not a.get('width') or not a.get('height')):self.errors.append('Image missing alt or dimensions: '+a.get('src',''))
  for attr in ('src','href'):
   if a.get(attr):self.links.append(a[attr])
  if tag in ('script','iframe') and a.get('src','').startswith('http'):self.errors.append('Remote script/iframe: '+a['src'])

docs={}
for p in ROOT.rglob('*.html'):
 if '.git' in p.parts:continue
 d=Document();d.feed(p.read_text());docs[p]=d
errors=[]
for p,d in docs.items():
 for err in d.errors:errors.append(f'{p.relative_to(ROOT)}: {err}')
 if not d.title or not d.viewport or d.h1!=1:errors.append(f'{p.relative_to(ROOT)}: title/viewport/h1 invalid ({d.h1})')
 for url in d.links:
  u=urlsplit(url)
  if u.scheme or u.netloc:continue
  target=ROOT/unquote(u.path).lstrip('/') if u.path.startswith('/') else p.parent/unquote(u.path)
  if not u.path:target=p
  elif target.is_dir():target=target/'index.html'
  if not target.exists():errors.append(f'{p.relative_to(ROOT)}: missing {url}');continue
  if u.fragment and target in docs and unquote(u.fragment) not in docs[target].ids:errors.append(f'{p.relative_to(ROOT)}: missing fragment {url}')
data=json.loads((ROOT/'content/site.json').read_text())
for kind in ('publications','projects','courses'):
 html=(ROOT/kind/'index.html').read_text()
 expected=sum(len(g['items']) for g in data[kind])
 actual=len(re.findall('class="record ',html))
 if actual!=expected:errors.append(f'{kind}: {actual} rendered / {expected} expected')
if errors:
 print('\n'.join(errors));sys.exit(1)
print(f'PASS: {len(docs)} HTML documents; local links, anchor targets, media, metadata, and archive record counts.')
print(json.dumps({k:sum(len(g['items']) for g in data[k]) for k in ['publications','projects','courses']}))
