import { compareVersions } from "compare-versions";
import { html } from "lit";
import { repeat } from "lit/directives/repeat.js";
import {
  PackageDetailField,
  PackageInfoAdapter,
} from "package-manager/PackageInfoAdapter";
import { IPCPackageManager } from "../IPCPackageManager";

declare global {
  interface Window {
    scoop: IPCScoop;
  }
}

// TODO: SortKey
export type IPCScoop = IPCPackageManager<ScoopPackageInfo, "">;

export type ScoopPackageInfo = {
  rowid?: number;

  name: string;
  bucket: string;

  manifest?: ScoopManifest;
  installed?: ScoopExportApp;
};

// https://github.com/ScoopInstaller/Scoop/wiki/App-Manifests
export type ScoopManifest = {
  version: string;
  description: string;
  homepage: string;
  license: string;

  "##"?: string;
  architecture?: any;
  autoupdate?: any;
  bin?: string | string[];
  checkver?: any;
  depends?: string[];
  env_add_path?: string | string[];
  env_set?: string | string[];
  extract_dir?: string | string[];
  extract_to?: string | string[];
  hash?: string | string[];
  innosetup?: boolean;
  installer?: any;
  notes?: string | string[];
  persist?: string | (string | [string, string])[];
  post_install?: string | string[];
  pre_install?: string | string[];
  post_uninstall?: string | string[];
  pre_uninstall?: string | string[];
  psmodule?: any;
  shortcuts?: any;
  suggest?: string[];
  uninstaller?: any;
  url?: string | string[];
};

export type ScoopExport = {
  buckets: ScoopExportBucket[];
  apps: ScoopExportApp[];
};

export type ScoopExportBucket = {
  Name: string;
  Source: string;
  Updated: {
    value: string;
    DisplayHint: number;
    DateTime: string;
  };
  Manifests: number;
};

export type ScoopExportApp = {
  Info: string;
  Source: string;
  Name: string;
  Version: string;
  Updated: string;
};

export class ScoopPackageInfoAdapter
  implements PackageInfoAdapter<ScoopPackageInfo>
{
  packageName(packageInfo: ScoopPackageInfo): string {
    return packageInfo.name;
  }

  packageIdentifier(packageInfo: ScoopPackageInfo): string {
    return `${packageInfo.bucket}/${packageInfo.name}`;
  }

  packageDescription(packageInfo: ScoopPackageInfo): string {
    return packageInfo.manifest?.description ?? "[Removed]";
  }

  packageSourceRepsitoryName(packageInfo: ScoopPackageInfo): string {
    return packageInfo.bucket;
  }

  packageWebsiteURL(packageInfo: ScoopPackageInfo): string | undefined {
    return packageInfo.manifest?.homepage;
  }

  packageIconURL(packageInfo: ScoopPackageInfo): string | undefined {
    return undefined;
  }

  packagePublisher(packageInfo: ScoopPackageInfo): string | undefined {
    return undefined;
  }

  packageLastUpdated(packageInfo: ScoopPackageInfo): number | undefined {
    return undefined;
  }

  isPackageInstalled(packageInfo: ScoopPackageInfo): boolean {
    return !!packageInfo.installed;
  }

  isPackageOutdated(packageInfo: ScoopPackageInfo): boolean {
    return (
      !!packageInfo.manifest &&
      !!packageInfo.installed &&
      compareVersions(
        packageInfo.installed.Version,
        packageInfo.manifest.version
      ) > 0
    );
  }

  isPackageDeprecated(packageInfo: ScoopPackageInfo): boolean {
    return false;
  }

  isPackageDisabled(packageInfo: ScoopPackageInfo): boolean {
    return !packageInfo.manifest;
  }

  isPackageOvert(packageInfo: ScoopPackageInfo): boolean {
    return packageInfo.name === "overt";
  }

  packageDetails(packageInfo: ScoopPackageInfo): PackageDetailField[][] {
    return [
      [
        {
          heading: "Versions",
          value: {
            Installed: packageInfo.installed
              ? packageInfo.installed.Version +
                (packageInfo.installed.Info
                  ? ` (${packageInfo.installed.Info})`
                  : "")
              : "None",
            Latest: packageInfo.manifest?.version ?? "No longer available",
          },
        },
      ],
      [
        {
          heading: "Depends on",
          value: packageInfo.manifest?.depends?.length
            ? html`<ul>
                ${repeat(
                  packageInfo.manifest.depends ?? [],
                  (appIdentifier) => html`<li>${appIdentifier}</li>`
                )}
              </ul>`
            : null,
          valuesArePackageNames: true,
        },
        {
          heading: "Improved by installing",
          value: packageInfo.manifest?.suggest?.length
            ? html`<ul>
                ${repeat(
                  packageInfo.manifest.suggest ?? [],
                  (appIdentifier) => html`<li>${appIdentifier}</li>`
                )}
              </ul>`
            : null,
          valuesArePackageNames: true,
        },
      ],
    ];
  }
}
