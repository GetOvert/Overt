#!/bin/bash

set -eo pipefail

cd "$(dirname "$0")/.."

if ! [ -n "$CODESIGN_IDENTITY" -a -n "$NOTARIZE_APPLE_ID" -a -n "$NOTARIZE_PASSWORD" ]
then
  cat <<END
Please set env vars:
- CODESIGN_IDENTITY: Name of certificate in keychain with which to sign apps
- NOTARIZE_APPLE_ID: Email address for Apple ID with which to submit apps to Apple notary service
- NOTARIZE_PASSWORD: Password for NOTARIZE_APPLE_ID (specify "@keychain:SOME_IDENTIFIER" to grab
                     a keychain entry, if you've set that up already)
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
