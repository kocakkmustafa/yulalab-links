"""Validate local hosting files and stage the exact five-file static artifact."""
import base64
import hashlib
import json
import shutil
import sys
import tomllib
from html.parser import HTMLParser
from pathlib import Path

root = Path(__file__).resolve().parents[2]
config = tomllib.loads((root / "netlify.toml").read_text())
assert config == {"build": {"publish": "."}}, "static build must stay command/plugin-free"
vercel = json.loads((root / "vercel.json").read_text())
redirects = []
for line in (root / "_redirects").read_text().splitlines():
    source, destination, status = line.split()
    assert status == "302"
    redirects.append({"source": source, "destination": destination, "permanent": False})
assert redirects == vercel["redirects"], "Netlify and Vercel short links diverged"
assert len(redirects) == 19

rules = {}
current = None
for line in (root / "_headers").read_text().splitlines():
    if not line.strip():
        continue
    if not line.startswith(" "):
        current = line
        assert current not in rules, "duplicate header rule"
        rules[current] = {}
    else:
        assert current is not None
        key, value = line.strip().split(":", 1)
        assert key not in rules[current], "duplicate header"
        rules[current][key] = value.strip()
expected = {h["key"]: h["value"] for h in vercel["headers"][0]["headers"]}
assert rules["/*"] == expected, "global hosting headers diverged"
cache = {"Cache-Control": "public, max-age=0, must-revalidate"}
assert rules["/"] == rules["/index.html"] == cache
assert set(rules) == {"/*", "/", "/index.html"}


class Scripts(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.scripts = []
        self.inside = False

    def handle_starttag(self, tag, attrs):
        if tag == "script":
            assert "src" not in dict(attrs), "unexpected external script"
            self.inside = True
            self.scripts.append("")

    def handle_data(self, data):
        if self.inside:
            self.scripts[-1] += data

    def handle_endtag(self, tag):
        if tag == "script":
            self.inside = False


parser = Scripts()
parser.feed((root / "index.html").read_text())
assert len(parser.scripts) == 1
script_hash = base64.b64encode(hashlib.sha256(parser.scripts[0].encode()).digest()).decode()
assert f"script-src 'sha256-{script_hash}'" in rules["/*"]["Content-Security-Policy"]

files = ("index.html", "_headers", "_redirects", "robots.txt", "sitemap.xml")
destination = Path(sys.argv[1]).resolve()
assert destination != root and root not in destination.parents, "artifact must be outside publish root"
destination.mkdir(parents=True, exist_ok=False)
manifest = []
for name in files:
    source = root / name
    target = destination / name
    shutil.copyfile(source, target)
    assert source.read_bytes() == target.read_bytes()
    manifest.append({"path": name, "bytes": target.stat().st_size,
                     "sha256": hashlib.sha256(target.read_bytes()).hexdigest()})
assert {p.name for p in destination.iterdir()} == set(files)
print(json.dumps({"status": "PASS", "redirects": len(redirects), "headerRules": len(rules),
                  "inlineScriptHash": script_hash, "files": manifest}, indent=2))
