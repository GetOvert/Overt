import { PackageInfoAdapter } from "package-manager/PackageInfoAdapter";
import { IPCPackageManager } from "../IPCPackageManager";
import { ScoopPackageInfoAdapter } from "./IPCScoop";
import { WingetPackageInfoAdapter } from "./IPCWinget";

export const allPackageMangers = ["scoop"/*, "winget"*/];

export function packageManagerForName(
  name: string
): IPCPackageManager<unknown, unknown> {
  switch (name) {
    case "scoop":
      return window.scoop;
    case "winget":
      return window.winget;
  }
  throw new Error(`Unknown package manager: ${name}`);
}

export function packageInfoAdapterForPackageManagerName(
  name: string
): PackageInfoAdapter<unknown> {
  switch (name) {
    case "scoop":
      return new ScoopPackageInfoAdapter();
    case "winget":
      return new WingetPackageInfoAdapter();
  }
  throw new Error(`Unknown package manager: ${name}`);
}
