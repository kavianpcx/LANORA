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
    windows_artifact = temp / "LANORA_0.3.0-alpha.1_x64-setup.exe"
    windows_signature = temp / (windows_artifact.name + ".sig")
    linux_artifact = temp / "LANORA_0.3.0-alpha.1_amd64.deb"
    linux_signature = temp / (linux_artifact.name + ".sig")
    output = temp / "latest.json"
    notes.write_text("Test release notes", encoding="utf-8")
    windows_artifact.write_bytes(b"signed Windows updater artifact placeholder")
    windows_signature.write_text("windows-signature-bytes\n", encoding="utf-8")
    linux_artifact.write_bytes(b"signed Debian updater artifact placeholder")
    linux_signature.write_text("linux-signature-bytes\n", encoding="utf-8")
    command = [
        sys.executable, str(script),
        "--version", "0.3.0-alpha.1",
        "--notes", str(notes),
        "--artifact", str(windows_artifact),
        "--signature", str(windows_signature),
        "--linux-artifact", str(linux_artifact),
        "--linux-signature", str(linux_signature),
        "--release-url", "https://github.com/kavianpcx/LANORA/releases/download/v0.3.0-alpha.1",
        "--output", str(output),
    ]
    subprocess.run(command, check=True)
    manifest = json.loads(output.read_text(encoding="utf-8"))
    windows = manifest["platforms"]["windows-x86_64"]
    linux = manifest["platforms"]["linux-x86_64"]
    release_url = "https://github.com/kavianpcx/LANORA/releases/download/v0.3.0-alpha.1"
    assert manifest["version"] == "0.3.0-alpha.1"
    assert manifest["notes"] == "Test release notes"
    assert windows["signature"] == "windows-signature-bytes"
    assert windows["url"] == f"{release_url}/{windows_artifact.name}"
    assert linux["signature"] == "linux-signature-bytes"
    assert linux["url"] == f"{release_url}/{linux_artifact.name}"

    wrong_signature = temp / "different-artifact.exe.sig"
    wrong_signature.write_text("wrong-signature", encoding="utf-8")
    bad_windows = command.copy()
    bad_windows[bad_windows.index(str(windows_signature))] = str(wrong_signature)
    bad_windows[bad_windows.index(str(output))] = str(temp / "wrong-windows.json")
    assert subprocess.run(bad_windows, capture_output=True, text=True).returncode != 0

    wrong_linux_signature = temp / "different-artifact.deb.sig"
    wrong_linux_signature.write_text("wrong-signature", encoding="utf-8")
    bad_linux = command.copy()
    bad_linux[bad_linux.index(str(linux_signature))] = str(wrong_linux_signature)
    bad_linux[bad_linux.index(str(output))] = str(temp / "wrong-linux.json")
    assert subprocess.run(bad_linux, capture_output=True, text=True).returncode != 0

print("PASS: updater manifest uses the exact signed Windows and Linux artifacts")
