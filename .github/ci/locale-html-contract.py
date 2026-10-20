"""Parse shipped HTML, fourteen noscript directories and exact two-script CSP.

Document/catalogue contracts only; no network or browser execution.
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse
import base64,hashlib,json

root=Path(__file__).resolve().parents[2]
source=(root/'index.html').read_text()
catalogue=json.JSONDecoder().raw_decode(source.split('const L10N = ',1)[1])[0]
locales=['tr','en','es-419','pt-BR','de','fr','ja','ar','it','ko','id','pl','hi','zh-Hans']
assert list(catalogue)==locales
slugs=['braavolabs','burunfarki','lifeos','gravita','lissom','jablab','ostinato','choreia']
class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True);self.ids=[];self.details=[];self.current=None;self.meta=[]
        self.scripts=[];self.script=None;self.in_noscript=False;self.noscript_count=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag=='html':self.html=a
        if tag=='meta':self.meta.append(a)
        if tag=='script':
            self.script={'attributes':a,'chunks':[]};self.scripts.append(self.script)
        if tag=='noscript':self.in_noscript=True;self.noscript_count+=1
        if tag=='details' and self.in_noscript:
            assert self.current is None, 'language fallback directories must not be nested'
            self.current={'attributes':a,'links':[],'text':[]};self.details.append(self.current)
        if self.current and tag=='a':self.current['links'].append(a['href'])
    def handle_endtag(self,tag):
        if tag=='details':self.current=None
        if tag=='noscript':self.in_noscript=False
        if tag=='script':self.script=None
    def handle_data(self,data):
        if self.current:self.current['text'].append(data)
        if self.script is not None:self.script['chunks'].append(data)
p=Parser();p.feed(source);p.close()
assert len(p.ids)==len(set(p.ids))
assert {'app','noscript-title'}<=set(p.ids)
assert p.html['lang']=='tr' and p.html['dir']=='ltr'
assert '<title>'+catalogue['tr']['ui']['title']+'</title>' in source
for name in ['description','og:description','twitter:description']:
    assert any(m.get('name',m.get('property'))==name and m.get('content')==catalogue['tr']['ui']['description'] for m in p.meta)
assert [d['attributes']['lang'] for d in p.details]==locales
assert p.noscript_count==1
assert sum('open' in d['attributes'] for d in p.details)==1
assert 'open' in p.details[0]['attributes']
product_link_cells=0
for code,d in zip(locales,p.details):
    c=catalogue[code];base='https://yulalab.com'+('' if code=='tr' else '/'+code)
    assert d['attributes']['dir']==('rtl' if code=='ar' else 'ltr')
    assert c['dir']==d['attributes']['dir']
    assert all(base+'/projects/'+slug in d['links'] for slug in slugs)
    product_links=[url for url in d['links'] if '/projects/' in urlparse(url).path]
    assert len(product_links)==8 and set(product_links)=={base+'/projects/'+slug for slug in slugs}
    product_link_cells+=len(product_links)
    assert base+'/privacy' in d['links'] and 'mailto:support@yulalab.com' in d['links']
    text=''.join(d['text'])
    assert c['ui']['noJS'] in text and c['ui']['noJSIntro'] in text and '2026-08-21' in text
    assert set(c['ui'])==set(catalogue['tr']['ui']) and len(c['ui'])==42
    assert set(c['products'])==set(slugs)
    assert all(isinstance(value,str) and value.strip() for value in c['ui'].values())
    assert all(len(value)==2 and all(isinstance(text,str) and text.strip() for text in value) for value in c['products'].values())
    assert '18+' in c['ui']['burunLegal'] and 'Burun Farkı' in c['ui']['burunLegal']
    for url in d['links']:
        assert urlparse(url).scheme in ['https','mailto']
assert product_link_cells==112
assert sum(len(copy['ui']) for copy in catalogue.values())==588
alternates=[m['content'] for m in p.meta if m.get('property')=='og:locale:alternate']
assert len(alternates)==13 and len(set(alternates))==13
assert set(alternates)=={catalogue[code]['og'] for code in locales if code!='tr'}
assert catalogue['tr']['og'] not in alternates

# HTMLParser preserves raw script text, including whitespace, without executing
# either script. Each transport must permit exactly those two byte digests.
assert len(p.scripts)==2
assert all(not script['attributes'] for script in p.scripts), 'unexpected script attributes or remote src'
digests=[base64.b64encode(hashlib.sha256(''.join(script['chunks']).encode()).digest()).decode() for script in p.scripts]
assert len(set(digests))==2
html_csp=[m['content'] for m in p.meta if m.get('http-equiv','').lower()=='content-security-policy']
netlify_csp=[line.split(':',1)[1].strip() for line in (root/'_headers').read_text().splitlines() if line.strip().lower().startswith('content-security-policy:')]
vercel=json.loads((root/'vercel.json').read_text())
vercel_csp=[header['value'] for rule in vercel['headers'] for header in rule['headers'] if header['key'].lower()=='content-security-policy']
assert len(html_csp)==len(netlify_csp)==len(vercel_csp)==1
for name,policy in [('HTML',html_csp[0]),('Netlify',netlify_csp[0]),('Vercel',vercel_csp[0])]:
    directives=[part.strip().split() for part in policy.split(';') if part.strip()]
    script_src=[tokens[1:] for tokens in directives if tokens[0]=='script-src']
    assert script_src==[["'sha256-"+digest+"'" for digest in digests]], name+': script-src must be the exact two-script hash set'
    assert not any(token in ["'unsafe-inline'","'unsafe-eval'"] for token in script_src[0])
print(json.dumps({'result':'PASS','locales':14,'noscript_product_link_cells':product_link_cells,'ui_key_cells':588,'product_presentation_pairs':112,'product_presentation_texts':224,'og_alternates':13,'inline_script_count':2,'inline_script_sha256_base64':digests,'csp_exact_surfaces':['HTML','Netlify','Vercel'],'limit':'Parsed HTML/catalogue only; no browser, layout, assistive technology, physical device, provider, deploy or translation expert acceptance.'},ensure_ascii=False))
