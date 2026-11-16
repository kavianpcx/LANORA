"""Verify release-version consistency and local Markdown links."""
import json
import struct
from pathlib import Path
import re
from urllib.parse import unquote
root=Path(__file__).resolve().parents[1]
package=json.loads((root/'apps/desktop/package.json').read_text())
version=package['version']
assert version=='0.2.0-alpha.3'
tauri=json.loads((root/'apps/desktop/src-tauri/tauri.conf.json').read_text())
assert tauri['version']==version
nsis=tauri['bundle']['windows']['nsis']
assert nsis['installMode']=='currentUser'
assert nsis['displayLanguageSelector'] is True
assert 'icons/icon.ico' in tauri['bundle']['icon']
assert {'English','Farsi'} <= set(nsis['languages'])
for key, size in [('headerImage',(150,57)),('sidebarImage',(164,314))]:
    image=(root/'apps/desktop/src-tauri'/nsis[key]).read_bytes()
    assert image[:2]==b'BM', f'{key} must be a Windows bitmap'
    width,height=struct.unpack_from('<ii',image,18)
    assert (width,abs(height))==size, f'{key} dimensions are incorrect'
assert (root/'apps/desktop/src-tauri'/nsis['installerIcon']).is_file()
assert (root/'apps/desktop/src-tauri'/tauri['bundle']['licenseFile']).resolve()==(root/'LICENSE').resolve()
cargo=(root/'apps/desktop/src-tauri/Cargo.toml').read_text()
assert re.search(r'^version = "'+re.escape(version)+r'"$',cargo,re.M)
lock=json.loads((root/'apps/desktop/package-lock.json').read_text())
assert lock['version']==version and lock['packages']['']['version']==version
assert version in (root/'CHANGELOG.md').read_text()
assert version in (root/'README.md').read_text()
assert version in (root/'README.fa.md').read_text()
assert version in (root/'apps/desktop/src/components/TitleBar.tsx').read_text()
assert "release/0.2.x" in (root/'README.md').read_text()
app_source=(root/'apps/desktop/src/App.tsx').read_text()
assert 'document.documentElement.dir = "ltr"' in app_source
assert '<div className="lanora-app" dir="ltr"' in app_source
assert 'dir={lang === "fa" ? "rtl" : "ltr"}' not in app_source.split('<div className="lanora-app"')[0]
css_source=(root/'apps/desktop/src/style.css').read_text()
fa_rules=re.findall(r'\.lanora-app\[data-lang="fa"\][^{]*\{([^}]+)\}',css_source,re.S)
assert fa_rules, 'Persian text styles must be scoped to translated components'
for rule in fa_rules:
    assert not re.search(r'\b(flex-direction|grid-template|order|position|left|right)\s*:',rule), 'Persian styles must not rearrange the application shell'
design_system=(root/'docs/DESIGN_SYSTEM.md').read_text()
for section in ['Color tokens','Typography','Layout and spacing','Shape and elevation','Iconography','Buttons and forms','Dialogs and feedback','Motion and accessibility']:
    assert section in design_system, f'missing design system section: {section}'
for size in [16,32,64,128,256,512,1024]:
    image=(root/f'apps/desktop/src-tauri/icons/{size}x{size}.png').read_bytes()
    assert image[:8]==b'\x89PNG\r\n\x1a\n', f'{size}px icon must be PNG'
    width,height=struct.unpack_from('>II',image,16)
    assert (width,height)==(size,size), f'{size}px icon dimensions are incorrect'
master=(root/'assets/lanora-icon.png').read_bytes()
assert struct.unpack_from('>II',master,16)==(1024,1024)
icon=(root/'apps/desktop/src-tauri/icons/icon.ico').read_bytes()
assert icon[:4]==b'\x00\x00\x01\x00', 'Windows icon must be an ICO file'
for file in [*root.glob('*.md'),*root.glob('docs/*.md'),*root.glob('tests/*.md')]:
    for link in re.findall(r'\]\(([^)]+)\)',file.read_text()):
        if '://' in link or link.startswith(('#','mailto:')):continue
        target=unquote(link.split('#')[0])
        if target:assert (file.parent/target).exists(),f'{file.relative_to(root)}: broken link {target}'
print('PASS: alpha versions, personalized NSIS assets, license and Markdown links resolve')
