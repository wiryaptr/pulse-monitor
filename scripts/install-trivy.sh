#!/usr/bin/env bash
# Memasang Trivy yang dikunci ke satu versi dan satu sha256. Sengaja tanpa GitHub Action pihak ketiga.
#
# Latar belakang: pada Maret 2026 rantai pasokan Trivy dibobol (CVE-2026-33634, GHSA-69fq-xp46-6x23):
# trivy-action, setup-trivy, binary v0.69.4, dan image 0.69.4 sampai 0.69.6 berisi pencuri kredensial.
# Versi ini (v0.69.3) tercantum aman di advisory itu dan rilisnya immutable.
#
# Menaikkan versi: periksa dulu advisory terbaru, sha256 terhadap checksums.txt di rilis yang sama, dan
# tanda tangan Sigstore (cosign verify-blob), baru ganti VERSION dan SHA256 di bawah.
#
#   bash scripts/install-trivy.sh [direktori-tujuan]     (bawaan: $HOME/.local/bin)
set -euo pipefail

VERSION="0.69.3"
SHA256="1816b632dfe529869c740c0913e36bd1629cb7688bd5634f4a858c1d57c88b75"
DEST="${1:-$HOME/.local/bin}"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

curl -fsSL --retry 3 -o "$tmp/trivy.tar.gz" \
  "https://github.com/aquasecurity/trivy/releases/download/v${VERSION}/trivy_${VERSION}_Linux-64bit.tar.gz"
echo "${SHA256}  $tmp/trivy.tar.gz" | sha256sum -c - || { echo "GAGAL: sha256 Trivy tidak cocok, tidak dipasang" >&2; exit 1; }

tar -xzf "$tmp/trivy.tar.gz" -C "$tmp" trivy
mkdir -p "$DEST"
install -m 0755 "$tmp/trivy" "$DEST/trivy"
if [[ -n "${GITHUB_PATH:-}" ]]; then echo "$DEST" >> "$GITHUB_PATH"; fi
"$DEST/trivy" --version | head -n 1
