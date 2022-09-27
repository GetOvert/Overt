import { PackageInfoAdapter } from "package-manager/PackageInfoAdapter";
import { IPCPackageManager } from "../IPCPackageManager";
import { WingetPackageInfoAdapter } from "./IPCWinget";

export const allPackageMangers = ["winget"];

export function packageManagerForName(
  name: string
): IPCPackageManager<unknown, unknown> {
  switch (name) {
    case "winget":
      return window.winget;
  }
  throw new Error(`Unknown package manager: ${name}`);
}

export function packageInfoAdapterForPackageManagerName(
  name: string
): PackageInfoAdapter<unknown> {
  switch (name) {
    case "winget":
      return new WingetPackageInfoAdapter();
  }
  throw new Error(`Unknown package manager: ${name}`);
}
