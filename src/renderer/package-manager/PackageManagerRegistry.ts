import { IPCPackageManager } from "ipc/package-managers/IPCPackageManager";
import { BrewPackageInfoAdapter } from "ipc/package-managers/macOS/IPCBrew";
import { BrewCaskPackageInfoAdapter } from "ipc/package-managers/macOS/IPCBrewCask";
import { PackageInfoAdapter } from "./PackageInfoAdapter";

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
