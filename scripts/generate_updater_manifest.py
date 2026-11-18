#!/usr/bin/env python3
"""Build Tauri's static update manifest from signed Windows and Debian artifacts."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from urllib.parse import quote


def require_artifact(artifact: Path, signature: Path, suffix: str, platform: str) -> str:
    if not artifact.is_file() or artifact.suffix.lower() != suffix:
        raise SystemExit(f"the updater artifact must be an existing {platform} {suffix} file")
    if not signature.is_file():
        raise SystemExit(f"the Tauri {platform} updater signature file is missing")
    if signature.name != f"{artifact.name}.sig":
        raise SystemExit(f"the updater signature filename does not match the {platform} artifact")
    signature_text = signature.read_text(encoding="utf-8").strip()
    if not signature_text:
        raise SystemExit(f"the Tauri {platform} updater signature file is empty")
    return signature_text


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", required=True)
    parser.add_argument("--notes", type=Path, required=True)
    parser.add_argument("--artifact", type=Path, required=True, help="signed Windows NSIS installer")
    parser.add_argument("--signature", type=Path, required=True, help="matching Windows .exe.sig")
    parser.add_argument("--linux-artifact", type=Path, required=True, help="signed Debian package")
    parser.add_argument("--linux-signature", type=Path, required=True, help="matching Linux .deb.sig")
    parser.add_argument("--release-url", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    if not re.fullmatch(r"\\d+\\.\\d+\\.\\d+-(?:alpha|beta|rc)\\.\\d+", args.version):
        raise SystemExit(f"refusing unexpected prerelease version: {args.version}")
    windows_signature = require_artifact(args.artifact, args.signature, ".exe", "Windows")
    linux_signature = require_artifact(args.linux_artifact, args.linux_signature, ".deb", "Linux")
    if not args.notes.is_file():
        raise SystemExit("release notes are missing")
    if not args.release_url.startswith("https://github.com/"):
        raise SystemExit("release URL must use HTTPS on GitHub")

    release_url = args.release_url.rstrip("/")
    manifest = {
        "version": args.version,
        "notes": args.notes.read_text(encoding="utf-8").strip(),
        "pub_date": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "platforms": {
            "windows-x86_64": {
                "url": f"{release_url}/{quote(args.artifact.name)}",
                "signature": windows_signature,
            },
            "linux-x86_64": {
                "url": f"{release_url}/{quote(args.linux_artifact.name)}",
                "signature": linux_signature,
            },
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\\n", encoding="utf-8")


if __name__ == "__main__":
    main()
