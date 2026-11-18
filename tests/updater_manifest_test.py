import json
from pathlib import Path
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[1]
script = root / "scripts/generate_updater_manifest.py"

with tempfile.TemporaryDirectory() as directory:
    temp = Path(directory)
    notes = temp / "release.md"
    artifact = temp / "LANORA_0.3.0-alpha.1_x64-setup.exe"
    signature = temp / (artifact.name + ".sig")
    output = temp / "latest.json"
    notes.write_text("Test release notes", encoding="utf-8")
    artifact.write_bytes(b"signed updater artifact placeholder")
    signature.write_text("signature-bytes-from-tauri\n", encoding="utf-8")
    subprocess.run([
        sys.executable, str(script),
        "--version", "0.3.0-alpha.1",
        "--notes", str(notes),
        "--artifact", str(artifact),
        "--signature", str(signature),
        "--release-url", "https://github.com/kavianpcx/LANORA/releases/download/v0.3.0-alpha.1",
        "--output", str(output),
    ], check=True)
    manifest = json.loads(output.read_text(encoding="utf-8"))
    windows = manifest["platforms"]["windows-x86_64"]
    assert manifest["version"] == "0.3.0-alpha.1"
    assert manifest["notes"] == "Test release notes"
    assert windows["signature"] == "signature-bytes-from-tauri"
    assert windows["url"] == "https://github.com/kavianpcx/LANORA/releases/download/v0.3.0-alpha.1/LANORA_0.3.0-alpha.1_x64-setup.exe"
    wrong_signature = temp / "different-artifact.exe.sig"
    wrong_signature.write_text("wrong-signature", encoding="utf-8")
    failed = subprocess.run([
        sys.executable, str(script),
        "--version", "0.3.0-alpha.1",
        "--notes", str(notes),
        "--artifact", str(artifact),
        "--signature", str(wrong_signature),
        "--release-url", "https://github.com/kavianpcx/LANORA/releases/download/v0.3.0-alpha.1",
        "--output", str(temp / "wrong.json"),
    ], capture_output=True, text=True)
    assert failed.returncode != 0

print("PASS: updater manifest uses the exact signed artifact, signature and HTTPS URL")
