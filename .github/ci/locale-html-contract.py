"""Parse the shipped HTML, noscript links and embedded catalogue; no network."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse
import base64,hashlib,json,re

root=Path(__file__).resolve().parents[2]
source=(root/'index.html').read_text()
catalogue=json.loads(source.split('const L10N = ',1)[1].split(';\nconst SUPPORTED_LOCALES',1)[0])
locales=['tr','en','es-419','pt-BR','de','fr','ja','ar']
assert list(catalogue)==locales
slugs=list(catalogue['tr']['products'])
class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True);self.ids=[];self.details=[];self.current=None;self.meta=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag=='html':self.html=a
        if tag=='meta':self.meta.append(a)
        if tag=='details':
            self.current={'attributes':a,'links':[],'text':[]};self.details.append(self.current)
        if self.current and tag=='a':self.current['links'].append(a['href'])
    def handle_endtag(self,tag):
        if tag=='details':self.current=None
    def handle_data(self,data):
        if self.current:self.current['text'].append(data)
p=Parser();p.feed(source);p.close()
assert len(p.ids)==len(set(p.ids))
assert {'app','noscript-title'}<=set(p.ids)
assert p.html['lang']=='tr' and p.html['dir']=='ltr'
assert '<title>'+catalogue['tr']['ui']['title']+'</title>' in source
for name in ['description','og:description','twitter:description']:
    assert any(m.get('name',m.get('property'))==name and m.get('content')==catalogue['tr']['ui']['description'] for m in p.meta)
assert [d['attributes']['lang'] for d in p.details]==locales
assert sum('open' in d['attributes'] for d in p.details)==1
for code,d in zip(locales,p.details):
    c=catalogue[code];base='https://yulalab.com'+('' if code=='tr' else '/'+code)
    assert d['attributes']['dir']==('rtl' if code=='ar' else 'ltr')
    assert all(base+'/projects/'+slug in d['links'] for slug in slugs)
    assert base+'/privacy' in d['links'] and 'mailto:support@yulalab.com' in d['links']
    text=''.join(d['text'])
    assert c['ui']['noJS'] in text and c['ui']['noJSIntro'] in text and '2026-08-21' in text
    assert set(c['ui'])==set(catalogue['tr']['ui']) and len(c['ui'])==42
    assert set(c['products'])==set(slugs)
    assert all(isinstance(value,str) and value.strip() for value in c['ui'].values())
    assert all(len(value)==2 and all(value) for value in c['products'].values())
    assert '18+' in c['ui']['burunLegal'] and 'Burun Farkı' in c['ui']['burunLegal']
    for url in d['links']:
        assert urlparse(url).scheme in ['https','mailto']
alternates=[m['content'] for m in p.meta if m.get('property')=='og:locale:alternate']
assert len(alternates)==7 and len(set(alternates))==7
script=re.search(r'<script>(.*?)</script>',source,re.S).group(1)
digest=base64.b64encode(hashlib.sha256(script.encode()).digest()).decode()
for name in ['index.html','_headers','vercel.json']:
    assert "script-src 'sha256-"+digest+"'" in (root/name).read_text()
print(json.dumps({'result':'PASS','locales':8,'noscript_product_link_cells':64,'ui_key_cells':336,'product_presentation_cells':64,'inline_script_sha256_base64':digest,'limit':'Parsed HTML/catalogue only; no browser, layout, assistive technology, physical device, provider, deploy or translation expert acceptance.'},ensure_ascii=False))
