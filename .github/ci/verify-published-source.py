from pathlib import Path
import hashlib
import json

root = Path(__file__).resolve().parents[2]
manifest = json.loads((root / ".github/ci/published-files.json").read_text())
for item in manifest["files"]:
    path = root / item["path"]
    assert path.is_file() and not path.is_symlink(), item["path"]
    assert hashlib.sha256(path.read_bytes()).hexdigest() == item["sha256"], item["path"]
print(f"published-source: PASS ({len(manifest['files'])} unchanged files; explicit harness exceptions: {manifest['allowedHarnessChanges']})")
