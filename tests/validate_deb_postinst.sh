#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ! -f "$1" ]]; then
  echo "usage: $0 PACKAGE.deb" >&2
  exit 2
fi

deb=$1
contents="$(dpkg-deb --contents "$deb")"
if ! grep -q 'easytier-core' <<<"$contents"; then
  echo "package does not contain easytier-core: $deb" >&2
  exit 1
fi

control_dir="$(mktemp -d)"
trap 'rm -rf "$control_dir"' EXIT
dpkg-deb --control "$deb" "$control_dir"
if [[ ! -f "$control_dir/postinst" ]]; then
  echo "package is missing its postinst control script: $deb" >&2
  exit 1
fi
