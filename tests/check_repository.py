"""Verify release-version consistency and local Markdown links."""
import json
from pathlib import Path
import re
from urllib.parse import unquote
root=Path(__file__).resolve().parents[1]
package=json.loads((root/'apps/desktop/package.json').read_text())
version=package['version']
assert version=='0.2.0-alpha.1'
assert json.loads((root/'apps/desktop/src-tauri/tauri.conf.json').read_text())['version']==version
cargo=(root/'apps/desktop/src-tauri/Cargo.toml').read_text()
assert re.search(r'^version = "'+re.escape(version)+r'"$',cargo,re.M)
lock=json.loads((root/'apps/desktop/package-lock.json').read_text())
assert lock['version']==version and lock['packages']['']['version']==version
assert version in (root/'CHANGELOG.md').read_text()
for file in [*root.glob('*.md'),*root.glob('docs/*.md'),*root.glob('tests/*.md')]:
    for link in re.findall(r'\]\(([^)]+)\)',file.read_text()):
        if '://' in link or link.startswith(('#','mailto:')):continue
        target=unquote(link.split('#')[0])
        if target:assert (file.parent/target).exists(),f'{file.relative_to(root)}: broken link {target}'
print('PASS: alpha versions match and local Markdown links resolve')
