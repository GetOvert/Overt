import { html } from "lit";
import { repeat } from "lit/directives/repeat.js";
import {
  PackageDetailField,
  PackageInfoAdapter,
} from "package-manager/PackageInfoAdapter";
import { IPCPackageManager } from "../IPCPackageManager";

declare global {
  interface Window {
    brew: IPCBrew;
  }
}

export type IPCBrew = IPCPackageManager<BrewPackageInfo, SortKey>;

export type BrewPackageInfo = {
  name: string;
  full_name: string;
  tap: string;
  desc: string;
  homepage: string;
  versions: {
    stable: string;
    head?: string;
    bottle?: boolean;
  };
  installed: any[];
  dependencies?: string[];
  recommended_dependencies?: string[];
  optional_dependencies?: string[];
  conflicts_with?: string[];
  aliases?: string[];
  outdated: boolean;
  deprecated: boolean;
  deprecation_date?: string | null;
  deprecation_reason?: string | null;
  disabled: boolean;
  disable_date?: string | null;
  disable_reason?: string | null;
  installed_30d?: string | null; // TODO: Better typing
  installed_90d?: string | null; // TODO: Better typing
  installed_365d?: string | null; // TODO: Better typing
  updated?: number;
  // TODO: There are more fields that aren't here yet
};

export class BrewPackageInfoAdapter
  implements PackageInfoAdapter<BrewPackageInfo>
{
  packageName(packageInfo: BrewPackageInfo): string {
    return packageInfo.name;
  }

  packageIdentifier(packageInfo: BrewPackageInfo): string {
    return packageInfo.full_name;
  }

  packageDescription(packageInfo: BrewPackageInfo): string {
    return packageInfo.desc;
  }

  packageWebsiteURL(packageInfo: BrewPackageInfo): string | undefined {
    return packageInfo.homepage;
  }

  packageIconURL(packageInfo: BrewPackageInfo): string | undefined {
    return undefined;
  }

  packagePublisher(packageInfo: BrewPackageInfo): string | undefined {
    return undefined;
  }

  packageLastUpdated(packageInfo: BrewPackageInfo): number | undefined {
    return packageInfo.updated;
  }

  isPackageInstalled(packageInfo: BrewPackageInfo): boolean {
    return !!packageInfo.installed.length;
  }

  isPackageOutdated(packageInfo: BrewPackageInfo): boolean {
    return packageInfo.outdated;
  }

  isPackageDeprecated(packageInfo: BrewPackageInfo): boolean {
    return packageInfo.deprecated;
  }

  isPackageDisabled(packageInfo: BrewPackageInfo): boolean {
    return packageInfo.disabled;
  }

  packageDetails(packageInfo: BrewPackageInfo): PackageDetailField[][] {
    return [
      [
        {
          heading: "Status",
          value: packageInfo.disabled
            ? html`<dl class="text-danger">
                <dt>
                  Disabled${packageInfo.disable_date
                    ? ` ${packageInfo.disable_date}`
                    : ""}:
                </dt>
                <dd>${packageInfo.disable_reason}</dd>
              </dl>`
            : packageInfo.deprecated
            ? html`<dl class="text-danger">
                <dt>
                  Deprecated${packageInfo.deprecation_date
                    ? ` ${packageInfo.deprecation_date}`
                    : ""}:
                </dt>
                <dd>${packageInfo.deprecation_reason}</dd>
              </dl>`
            : null,
        },
        {
          heading: "Versions",
          value: {
            Installed: packageInfo.installed?.[0]?.version ?? "None",
            "Latest stable": packageInfo.versions?.stable ?? "None",
            "Last updated": packageInfo.updated
              ? new Date(packageInfo.updated).toLocaleString(undefined, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                })
              : "Unknown",
          },
        },
        {
          heading: "Installs (non-dependency)",
          value:
            packageInfo.installed_30d !== null
              ? {
                  "30 days": (+packageInfo.installed_30d!).toLocaleString(),
                  "90 days": (+packageInfo.installed_90d!).toLocaleString(),
                  "365 days": (+packageInfo.installed_365d!).toLocaleString(),
                }
              : null,
        },
      ],
      [
        {
          heading: "Identifiers",
          value: html`<ul>
            ${repeat(
              [packageInfo.full_name, ...(packageInfo.aliases ?? [])],
              (identifier) => html`<li>${identifier}</li>`
            )}
          </ul>`,
        },
        {
          heading: "Dependencies",
          value: packageInfo.dependencies,
          valuesArePackageNames: true,
        },
        {
          heading: "Recommended dependencies",
          value: packageInfo.recommended_dependencies,
          valuesArePackageNames: true,
        },
        {
          heading: "Optional dependencies",
          value: packageInfo.optional_dependencies,
          valuesArePackageNames: true,
        },
        {
          heading: "Conflicts with",
          value:
            packageInfo.conflicts_with &&
            Object.keys(packageInfo.conflicts_with).length
              ? html`<ul>
                  ${repeat(
                    Object.entries(packageInfo.conflicts_with).flatMap(
                      ([, identifiers]) => identifiers
                    ),
                    (identifier) => html`<li>${identifier}</li>`
                  )}
                </ul>`
              : null,
          valuesArePackageNames: true,
        },
      ],
    ];
  }
}

export type SortKey =
  | "installed-30d"
  | "installed-90d"
  | "installed-365d"
  | "updated"
  | "added";
