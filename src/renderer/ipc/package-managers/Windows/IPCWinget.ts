import { html } from "lit";
import {
  PackageDetailField,
  PackageInfoAdapter,
} from "package-manager/PackageInfoAdapter";
import { IPCPackageManager } from "../IPCPackageManager";

declare global {
  interface Window {
    winget: IPCWinget;
  }
}

export type IPCWinget = IPCPackageManager<WingetPackageInfo, "">;

export type WingetPackageInfo = {
  name: string;
  id: string;
  version: string;
  source: string;
  installed_version?: string;
};

export class WingetPackageInfoAdapter
  implements PackageInfoAdapter<WingetPackageInfo>
{
  packageName(packageInfo: WingetPackageInfo): string {
    return packageInfo.name;
  }

  packageIdentifier(packageInfo: WingetPackageInfo): string {
    return packageInfo.id;
  }

  packageDescription(packageInfo: WingetPackageInfo): string {
    return "";
  }

  isPackageInstalled(packageInfo: WingetPackageInfo): boolean {
    return !!packageInfo.installed_version?.length;
  }

  isPackageOutdated(packageInfo: WingetPackageInfo): boolean {
    return (
      this.isPackageInstalled(packageInfo) &&
      packageInfo.installed_version !== packageInfo.version
    );
  }

  packageDetails(packageInfo: WingetPackageInfo): PackageDetailField[] {
    return [
      {
        heading: "Versions",
        value: html`<dl>
          <dt>Installed:</dt>
          <dd>${packageInfo.installed_version ?? "None"}</dd>
          <dt>Latest:</dt>
          <dd>${packageInfo.version}</dd>
        </dl>`,
      },
    ];
  }
}
