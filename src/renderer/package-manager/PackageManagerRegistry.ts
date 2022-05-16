import { IPCPackageManager } from "ipc/package-managers/IPCPackageManager";

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
