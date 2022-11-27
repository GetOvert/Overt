<div align="center">
  <img src="icons/overt-app-icon.png" alt="Overt app icon" width="20%">
</div>

# Overt <small>_beta_</small>

## An open app store for macOS

Overt helps you find, install, and manage your favorite apps.

Overt **doesn't**:

- Restrict app features
- Process payments

Overt **does**:

- Give you a catalog of 3,000+ apps at your fingertips
- Install, update, and uninstall apps with a single click
- Let you add your own source repositories

<a href="https://getovert.app/about">About</a> • <a href="https://getovert.app/install">Install</a>

## Bugs and feature requests

If you encounter a bug or would like to request a feature, please check the [issues page](https://github.com/GetOvert/Overt/issues) for a similar report, or open a new issue if you can't find one. Also, please understand that some feature requests may be declined or put on the backburner.

## Development

### Tech

- [Electron](https://www.electronjs.org) and [electron-forge](https://www.electronforge.io)
- [Lit](https://lit.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Bootswatch](https://bootswatch.com)
- [better-sqlite3](https://www.npmjs.com/package/better-sqlite3)
- [electron-store](https://github.com/sindresorhus/electron-store)
- Other wonderful libraries

### Setup

To develop Overt, use [Visual Studio Code](https://code.visualstudio.com/) (available [on Overt](https://getovert.app/open?action=overt:brew-cask%3F1=install%261[name]=visual-studio-code)) with the following extensions:

- [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) — you should set this up to run on file save for JS, TS, and HTML
- [Inline HTML](https://marketplace.visualstudio.com/items?itemName=pushqrdx.inline-html) — highlights and allows Prettier to format Lit's `html` and `css` template literals
- [vscode-sql-template-literal](https://marketplace.visualstudio.com/items?itemName=forbeslindesay.vscode-sql-template-literal) — highlights `sql` template literals

Clone this repository and run `npm i` to install packages.

Use `npm start` to build and run the app in dev/debug mode. Hot reload doesn't work correctly at the moment, so you should quit the app and re-run `npm start` when you make changes.

#### Build a release version

```sh
npm run make-for-arm64
# or
npm run make-for-x86_64

open out/
```

#### Package an official release

```sh
# Bump the appropriate version number (this creates a Git commit)
npm run bump-{major,minor,patch}

# Build release versions for both arm64 and x86_64, and update the cask definition
# (this command will fail and print a help message without certain env vars set)
npm run distribute-macos
```
