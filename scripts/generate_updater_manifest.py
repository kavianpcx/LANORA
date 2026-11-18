#!/usr/bin/env python3
"""Build Tauri's static update manifest from a real signed Windows artifact."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from urllib.parse import quote


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", required=True)
    parser.add_argument("--notes", type=Path, required=True)
    parser.add_argument("--artifact", type=Path, required=True)
    parser.add_argument("--signature", type=Path, required=True)
    parser.add_argument("--release-url", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    if not re.fullmatch(r"\d+\.\d+\.\d+-(?:alpha|beta|rc)\.\d+", args.version):
        raise SystemExit(f"refusing unexpected prerelease version: {args.version}")
    if not args.artifact.is_file() or args.artifact.suffix.lower() != ".exe":
        raise SystemExit("the updater artifact must be an existing Windows .exe")
    if not args.signature.is_file():
        raise SystemExit("the Tauri updater signature file is missing")
    if args.signature.name != f"{args.artifact.name}.sig":
        raise SystemExit("the updater signature filename does not match the Windows artifact")
    signature = args.signature.read_text(encoding="utf-8").strip()
    if not signature:
        raise SystemExit("the Tauri updater signature file is empty")
    if not args.notes.is_file():
        raise SystemExit("release notes are missing")
    if not args.release_url.startswith("https://github.com/"):
        raise SystemExit("release URL must use HTTPS on GitHub")

    artifact_url = f"{args.release_url.rstrip('/')}/{quote(args.artifact.name)}"
    manifest = {
        "version": args.version,
        "notes": args.notes.read_text(encoding="utf-8").strip(),
        "pub_date": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "platforms": {
            "windows-x86_64": {
                "url": artifact_url,
                "signature": signature,
            }
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
