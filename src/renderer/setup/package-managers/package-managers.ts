import { PackageManagerSetup } from "./PackageManagerSetup";

export let packageManagerSetups: Readonly<PackageManagerSetup[]>;

import { HomebrewSetup } from "./platform/macOS/HomebrewSetup";
if (process.platform === "darwin") {
  packageManagerSetups = Object.freeze([new HomebrewSetup()]);
}
