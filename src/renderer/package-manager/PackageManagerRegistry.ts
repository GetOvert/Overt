import * as macOS from "ipc/package-managers/macOS/macOSPackageManagerRegistry";
import * as windows from "ipc/package-managers/Windows/WindowsPackageManagerRegistry";

const platform = window.platform.getNodePlatformString();

export const allPackageMangers =
  platform === "darwin" ? macOS.allPackageMangers : windows.allPackageMangers;
export const packageManagerForName =
  platform === "darwin"
    ? macOS.packageManagerForName
    : windows.packageManagerForName;
export const packageInfoAdapterForPackageManagerName =
  platform === "darwin"
    ? macOS.packageInfoAdapterForPackageManagerName
    : windows.packageInfoAdapterForPackageManagerName;
