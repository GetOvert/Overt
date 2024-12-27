#!/bin/bash

set -eo pipefail

cd "$(dirname "$0")/.."

if ! [ -n "$CODESIGN_IDENTITY" -a -n "$NOTARIZE_KEYCHAIN_PROFILE" ]
then
  cat <<END
Please set env vars:
- CODESIGN_IDENTITY: Name of certificate in keychain with which to sign apps
- NOTARIZE_KEYCHAIN_PROFILE: Name of keychain profile with stored credentials for notarization
                             (see \`xcrun notarytool store-credentials\`)
END
  exit 1
fi

npm run make-for-arm64
npm run make-for-x86_64

version="$(git describe --tags --abbrev=0)"
# Strip off 'v'
version="${version:1}"

cat <<END
Once the binaries are on GitHub, update the cask definition with:
  brew bump-cask-pr --version=$version overt
END

open "out/make/zip/darwin"

cd -
