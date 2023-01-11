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
export type IPCScoop = IPCPackageManager<ScoopPackageInfo, SortKey>;

export type ScoopPackageInfo = {
  rowid?: number;

  name: string;
  bucket: string;

  official_name?: string;
  publisher?: string;
  updated?: number;

  manifest?: ScoopManifest;
  installed?: ScoopExportApp;
};

// https://github.com/ScoopInstaller/Scoop/wiki/App-Manifests
export type ScoopManifest = {
  version: string;
  description: string;
  homepage: string;
  license:
    | string
    | {
        identifier: string;
        url?: string;
      };

  "##"?: string;
  architecture?: any;
  autoupdate?: any;
  bin?: string | string[];
  checkver?: any;
  depends?: string | string[];
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
  suggest?: Record<string, string | string[]>;
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
  Source: string | null;
  Name: string;
  Version: string | null;
  Updated: string;
};

export class ScoopPackageInfoAdapter
  implements PackageInfoAdapter<ScoopPackageInfo>
{
  packageName(packageInfo: ScoopPackageInfo): string {
    return (
      (packageInfo.bucket === "extras" && packageInfo.official_name) ||
      packageInfo.name
    );
  }

  packageIdentifier(packageInfo: ScoopPackageInfo): string {
    return `${packageInfo.bucket}/${packageInfo.name}`;
  }

  packageDescription(packageInfo: ScoopPackageInfo): string {
    return packageInfo.manifest?.description ?? "";
  }

  packageSourceRepsitoryName(packageInfo: ScoopPackageInfo): string {
    return packageInfo.bucket;
  }

  packageWebsiteURL(packageInfo: ScoopPackageInfo): string | undefined {
    return packageInfo.manifest?.homepage;
  }

  packageIconURL(packageInfo: ScoopPackageInfo): string | undefined {
    const qualifiedName = `${packageInfo.bucket}/${packageInfo.name}`;
    return `https://storage.googleapis.com/storage.getovert.app/scoop/${qualifiedName}.png`;
  }

  packagePublisher(packageInfo: ScoopPackageInfo): string | undefined {
    return packageInfo.publisher;
  }

  packageLastUpdated(packageInfo: ScoopPackageInfo): number | undefined {
    return packageInfo.updated;
  }

  isPackageInstalled(packageInfo: ScoopPackageInfo): boolean {
    return !!packageInfo.installed;
  }

  isPackageOutdated(packageInfo: ScoopPackageInfo): boolean {
    try {
      return (
        typeof packageInfo.manifest?.version === "string" &&
        typeof packageInfo.installed?.Version === "string" &&
        compareVersions(
          packageInfo.installed.Version,
          packageInfo.manifest.version
        ) > 0
      );
    } catch (error) {
      console.error(error);
      return false;
    }
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
    const licenseIdentifiers =
      (typeof packageInfo.manifest?.license === "object"
        ? packageInfo.manifest.license.identifier
        : packageInfo.manifest?.license
      )?.split(/[,|]/) ?? [];
    const licenseURL =
      typeof packageInfo.manifest?.license === "object"
        ? packageInfo.manifest.license.url
        : undefined;

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
          heading: "Identifier",
          value: packageInfo.name,
        },
        {
          heading: "License",
          value: licenseURL
            ? html`
                <ul>
                  ${repeat(
                    licenseIdentifiers,
                    (identifier) => html`
                      <li>
                        <a
                          href=${licenseURL}
                          @click=${(event: Event) => {
                            event.preventDefault();
                            window.openExternalLink.open(licenseURL);
                          }}
                        >
                          ${identifier}
                        </a>
                      </li>
                    `
                  )}
                </ul>
              `
            : licenseIdentifiers,
        },
        {
          heading: "Notes",
          value: Array.isArray(packageInfo.manifest?.notes)
            ? packageInfo.manifest?.notes.join("\n")
            : packageInfo.manifest?.notes,
        },
        {
          heading: "Requires",
          value: [packageInfo.manifest?.depends ?? []].flat(1),
          valuesArePackageNames: true,
        },
        {
          heading: "May require",
          value: Object.fromEntries(
            Object.entries(packageInfo.manifest?.suggest ?? {}).map(
              ([feature, packageIdentifiers]) => [
                feature,
                [packageIdentifiers].flat(1),
              ]
            )
          ),
          valuesArePackageNames: true,
        },
      ],
    ];
  }
}

export type SortKey = "updated" | "added";
