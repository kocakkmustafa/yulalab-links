from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import json
import re
import subprocess
import xml.etree.ElementTree as ET

expected_files = ('README.md', 'index.html', 'robots.txt', 'sitemap.xml', 'vercel.json')
for name in expected_files:
    path = Path(name)
    assert path.is_file() and path.stat().st_size > 0, f'missing or empty: {name}'
    subprocess.run(['git', 'ls-files', '--error-unmatch', name], check=True, stdout=subprocess.DEVNULL)

slugs = ('braavolabs', 'burunfarki', 'lifeos', 'gravita', 'lissom', 'jablab', 'ostinato', 'choreia')
fragments = {'holding', *slugs}
html_text = Path('index.html').read_text(encoding='utf-8')
readme_text = Path('README.md').read_text(encoding='utf-8')
robots_text = Path('robots.txt').read_text(encoding='utf-8')

class ContractParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.hrefs = []
        self.duplicate_ids = set()

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        element_id = values.get('id')
        if element_id:
            if element_id in self.ids:
                self.duplicate_ids.add(element_id)
            self.ids.add(element_id)
        if 'href' in values:
            self.hrefs.append((tag, values['href'], values))

    handle_startendtag = handle_starttag

parser = ContractParser()
parser.feed(html_text)
parser.close()
assert not parser.duplicate_ids, f'duplicate ids: {sorted(parser.duplicate_ids)}'
assert {'app', 'noscript-title'} <= parser.ids
assert '<main id="app"' in html_text
assert '<title>YULA Lab — Links</title>' in html_text

external_hrefs = {href for _, href, _ in parser.hrefs if href.startswith('https://')}
for slug in slugs:
    assert f'https://yulalab.com/projects/{slug}' in external_hrefs
    assert f'/{slug}' in readme_text and f'#{slug}' in readme_text
    assert re.search(rf'^\s*{re.escape(slug)}\s*:', html_text, re.MULTILINE), f'missing presentation key: {slug}'
assert 'href="https://yulalab.com/privacy"' in html_text
assert 'href="https://yulalab.com"' in html_text

for tag, href, attrs in parser.hrefs:
    if href.startswith('#'):
        fragment = href[1:]
        if fragment:
            assert fragment in fragments, f'unresolved fragment: {href}'
        else:
            assert attrs.get('data-nav') in fragments, 'bare fragment requires a known data-nav target'
        continue
    if href == 'mailto:support@yulalab.com':
        continue
    parsed = urlparse(href)
    if parsed.scheme:
        assert parsed.scheme in {'https', 'data'}, f'forbidden URL scheme: {href}'
        continue
    relative = href.split('#', 1)[0].split('?', 1)[0]
    assert relative and Path(relative.lstrip('/')).is_file(), f'unresolved relative link: {href}'

assert re.search(r"\{slug:'lifeos',name:'LifeOS',lifecycle:'live'", html_text)
public_text = readme_text + '\n' + html_text
for label, pattern in {
    'venture-studio': r'\bventure studio\b',
    'three-products': r'\b3 products\b',
    'lifeos-coming-soon': r'lifeos\s*(?:[-—·:|]|</?[^>]+>|\s)*\s*coming[ -]soon',
    'shap': r'\bshap\b',
    '611': r'(?<!\d)611(?!\d)',
    '13587': r'(?<!\d)13[,.]587(?!\d)',
    '130930': r'(?<!\d)130[,.]930(?!\d)',
}.items():
    assert not re.search(pattern, public_text, re.IGNORECASE), f'prohibited stale claim: {label}'

root = ET.parse('sitemap.xml').getroot()
assert root.tag == '{http://www.sitemaps.org/schemas/sitemap/0.9}urlset'
locations = [node.text for node in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
assert locations == ['https://links.yulalab.com/']
lastmods = [node.text for node in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}lastmod')]
assert len(lastmods) == 1
date.fromisoformat(lastmods[0])
assert 'Sitemap: https://links.yulalab.com/sitemap.xml' in robots_text
assert re.search(r'^Allow:\s*/\s*$', robots_text, re.MULTILINE)

vercel = json.loads(Path('vercel.json').read_text(encoding='utf-8'))
assert vercel['cleanUrls'] is True and vercel['trailingSlash'] is False
redirects = vercel['redirects']
sources = [item['source'] for item in redirects]
assert len(sources) == len(set(sources))
redirect_fragments = set()
for item in redirects:
    assert item['permanent'] is False
    destination = item['destination']
    assert destination.startswith('/#'), f'non-local redirect: {destination}'
    fragment = destination[2:]
    assert fragment in fragments, f'unknown redirect fragment: {fragment}'
    redirect_fragments.add(fragment)
assert fragments <= redirect_fragments
headers = {entry['key']: entry['value'] for rule in vercel['headers'] for entry in rule['headers']}
csp = headers['Content-Security-Policy']
for directive in ("default-src 'none'", "object-src 'none'", "frame-ancestors 'none'", "form-action 'none'"):
    assert directive in csp
assert headers['X-Frame-Options'] == 'DENY'
print('static-contract: PASS')
