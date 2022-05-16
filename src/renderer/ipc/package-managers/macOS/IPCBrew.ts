import { IPCPackageManager } from "../IPCPackageManager";

declare global {
  interface Window {
    brew: IPCBrew;
  }
}

export type IPCBrew = IPCPackageManager<{}, SortKey>;

export type SortKey =
  | "installed-30d"
  | "installed-90d"
  | "installed-365d"
  | "updated"
  | "added";
