import { PackageInfoAdapter } from "package-manager/PackageInfoAdapter";
import { IPCPackageManager } from "../IPCPackageManager";
import { BrewPackageInfoAdapter } from "./IPCBrew";
import { BrewCaskPackageInfoAdapter } from "./IPCBrewCask";

export const allPackageMangers = ["brew", "brew-cask"];

export function packageManagerForName(
  name: string
): IPCPackageManager<unknown, unknown> {
  switch (name) {
    case "brew":
      return window.brew;
    case "brew-cask":
      return window.brewCask;
  }
}

export function packageInfoAdapterForPackageManagerName(
  name: string
): PackageInfoAdapter<unknown> {
  switch (name) {
    case "brew":
      return new BrewPackageInfoAdapter();
    case "brew-cask":
      return new BrewCaskPackageInfoAdapter();
  }
}
