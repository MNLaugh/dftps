#!/bin/sh
# Build script for DFtpS
# Creates a compiled binary and distribution zip

set -e

if ! command -v zip >/dev/null; then
	echo "Error: zip is required." 1>&2
	exit 1
fi

if ! command -v deno >/dev/null; then
	echo "Error: deno is required." 1>&2
	exit 1
fi

archive="dftps.zip"
exe="dftps"

echo "Compiling DFtpS..."
deno compile \
  --allow-net \
  --allow-read \
  --allow-write \
  --allow-env \
  --output "$exe" \
  ./tools/dftps.ts

if [ -f "$archive" ]; then
  rm "$archive"
fi

cp tools/default.config.toml dftps.toml

echo "Creating distribution archive..."
zip "$archive" "$exe" dftps.toml

rm "$exe"
rm dftps.toml

echo "✓ Created $archive"