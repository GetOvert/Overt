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

arm64_sha256="$(openssl sha256 -binary "out/make/zip/darwin/arm64/Overt-darwin-arm64-$version.zip" | xxd -p -c 256)"
x86_64_sha256="$(openssl sha256 -binary "out/make/zip/darwin/x64/Overt-darwin-x64-$version.zip" | xxd -p -c 256)"

tap_repo="$(brew --repo homebrew/cask)"
cask_definition_file="$tap_repo/Casks/overt.rb"

# I'm sorry
xcrun perl -pi -0 -e "s/(version\s*)\"[^\"]*\"/\$1\"$version\"/" "$cask_definition_file"
xcrun perl -pi -0 -e "s/(?<=arm:   \")\w{64}/$arm64_sha256/" "$cask_definition_file"
xcrun perl -pi -0 -e "s/(?<=intel: \")\w{64}/$x86_64_sha256/" "$cask_definition_file"

git -C "$tap_repo" add "$cask_definition_file"
git -C "$tap_repo" commit -m "Bump version to $version"
cat <<END
Once the binaries are on GitHub, manually push the updated cask definition with:
  git -C "$tap_repo" push
END

open "out/make/zip/darwin"

cd -
