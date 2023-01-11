import { PackageManagerSetup } from "./PackageManagerSetup";

export let packageManagerSetups: Readonly<PackageManagerSetup[]>;

import { HomebrewSetup } from "./platform/macOS/HomebrewSetup";
if (process.platform === "darwin") {
  packageManagerSetups = Object.freeze([new HomebrewSetup()]);
}

import { ScoopSetup } from "./platform/Windows/ScoopSetup";
if (process.platform === "win32") {
  packageManagerSetups = Object.freeze([new ScoopSetup()]);
}
