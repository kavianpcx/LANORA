#!/usr/bin/env bash
set -euo pipefail

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

make_package() {
  local root=$1 with_postinst=$2
  mkdir -p "$root/DEBIAN" "$root/usr/bin"
  printf '#!/bin/sh\nexit 0\n' > "$root/usr/bin/easytier-core"
  chmod 0755 "$root/usr/bin/easytier-core"
  cat > "$root/DEBIAN/control" <<'EOF'
Package: lanora-validation-test
Version: 1.0
Architecture: amd64
Maintainer: LANORA CI <ci@example.invalid>
Description: temporary package for validating Debian package checks
EOF
  if [[ "$with_postinst" == true ]]; then
    printf '#!/bin/sh\nexit 0\n' > "$root/DEBIAN/postinst"
    chmod 0755 "$root/DEBIAN/postinst"
  fi
}

make_package "$tmp/valid" true
make_package "$tmp/invalid" false
dpkg-deb --build "$tmp/valid" "$tmp/valid.deb" >/dev/null
dpkg-deb --build "$tmp/invalid" "$tmp/invalid.deb" >/dev/null

bash tests/validate_deb_postinst.sh "$tmp/valid.deb"
if bash tests/validate_deb_postinst.sh "$tmp/invalid.deb" >/dev/null 2>&1; then
  echo "invalid package without postinst unexpectedly passed" >&2
  exit 1
fi
echo "PASS: Debian postinst validator accepts valid packages and rejects missing scripts"
