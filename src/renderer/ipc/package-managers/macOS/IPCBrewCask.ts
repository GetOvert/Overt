import { html } from "lit";
import { repeat } from "lit/directives/repeat.js";
import {
  PackageDetailField,
  PackageInfoAdapter,
} from "package-manager/PackageInfoAdapter";
import { IPCPackageManager } from "../IPCPackageManager";

declare global {
  interface Window {
    brewCask: IPCBrewCask;
  }
}

export type IPCBrewCask = IPCPackageManager<BrewCaskPackageInfo, SortKey>;

export type BrewCaskPackageInfo = {
  token: string;
  full_token: string;
  tap: string;
  name: string[];
  version: string;
  desc: string;
  homepage: string;
  installed: string | null;
  auto_updates?: boolean;
  depends_on?: any; // TODO: Better typing
  conflicts_with?: any; // TODO: Better typing
  aliases?: string[];
  outdated: boolean;
  deprecated: boolean;
  deprecation_date?: string | null;
  deprecation_reason?: string | null;
  disabled: boolean;
  disable_date?: string | null;
  disable_reason?: string | null;
  artifacts: BrewCaskArtifact[];
  installed_30d?: string | null; // TODO: Better typing
  installed_90d?: string | null; // TODO: Better typing
  installed_365d?: string | null; // TODO: Better typing
  publisher?: string;
  updated?: number;
  // TODO: There are more fields that aren't here yet
};

export type BrewCaskArtifact = BrewCaskApp | BrewCaskUninstall | BrewCaskZap;

export type BrewCaskApp = {
  app: string[];
};

export type BrewCaskUninstall = {
  uninstall: BrewCaskUninstallItem[];
};

export type BrewCaskZap = {
  zap: BrewCaskUninstallItem[];
};

export type BrewCaskUninstallItem =
  | {
      launchctl: string | string[];
    }
  | {
      quit: string | string[];
    }
  | {
      pkgutil: string | string[];
    }
  | {
      delete: string | string[];
    }
  | {
      trash: string | string[];
    };

export class BrewCaskPackageInfoAdapter
  implements PackageInfoAdapter<BrewCaskPackageInfo>
{
  packageName(packageInfo: BrewCaskPackageInfo): string {
    return packageInfo.name[0];
  }

  packageIdentifier(packageInfo: BrewCaskPackageInfo): string {
    return packageInfo.full_token;
  }

  packageDescription(packageInfo: BrewCaskPackageInfo): string {
    return packageInfo.desc;
  }

  packageSourceRepsitoryName(packageInfo: BrewCaskPackageInfo): string {
    return packageInfo.tap;
  }

  packageWebsiteURL(packageInfo: BrewCaskPackageInfo): string | undefined {
    return packageInfo.homepage;
  }

  packageIconURL(packageInfo: BrewCaskPackageInfo): string | undefined {
    // Bit of a heuristic, but realistically, this shouldn't break
    const official = !packageInfo.full_token.includes("/");

    const qualifiedName = official
      ? `${packageInfo.tap}/${packageInfo.token}`
      : packageInfo.full_token;
    return `https://storage.googleapis.com/storage.getovert.app/brew/${qualifiedName}.png`;
  }

  packagePublisher(packageInfo: BrewCaskPackageInfo): string | undefined {
    return packageInfo.publisher;
  }

  packageLastUpdated(packageInfo: BrewCaskPackageInfo): number | undefined {
    return packageInfo.updated;
  }

  isPackageInstalled(packageInfo: BrewCaskPackageInfo): boolean {
    return !!packageInfo.installed;
  }

  isPackageOutdated(packageInfo: BrewCaskPackageInfo): boolean {
    return packageInfo.outdated;
  }

  isPackageDeprecated(packageInfo: BrewCaskPackageInfo): boolean {
    return packageInfo.deprecated;
  }

  isPackageDisabled(packageInfo: BrewCaskPackageInfo): boolean {
    return packageInfo.disabled;
  }

  isPackageOvert(packageInfo: BrewCaskPackageInfo): boolean {
    return packageInfo.token === "overt";
  }

  packageDetails(packageInfo: BrewCaskPackageInfo): PackageDetailField[][] {
    return [
      [
        {
          heading: "Versions",
          value: {
            Installed: packageInfo.installed ?? "None",
            Latest: packageInfo.version,
            Updates: packageInfo.auto_updates ? "In-app" : "Through Overt",
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
          heading: "Installs",
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
          heading: "Known as",
          value: packageInfo.name.length > 1 ? packageInfo.name : "",
        },
        {
          heading: "Identifiers",
          value: [packageInfo.full_token, ...(packageInfo.aliases ?? [])],
        },
        {
          heading: "Requirements",
          value:
            packageInfo.depends_on && Object.keys(packageInfo.depends_on).length
              ? html`<ul>
                  ${repeat(
                    packageInfo.depends_on.cask ?? [],
                    (appIdentifier) => html`<li>${appIdentifier}</li>`
                  )}
                  ${repeat(
                    packageInfo.depends_on.formula ?? [],
                    (appIdentifier) => html`<li>${appIdentifier}</li>`
                  )}
                  ${Object.keys(packageInfo.depends_on.macos ?? {}).map(
                    (operator) =>
                      packageInfo.depends_on.macos[operator].map(
                        (version: string) =>
                          html`<li>
                            macOS
                            ${(() =>
                              ({ ">=": "≥", "<=": "≤", "==": "=", "!=": "≠" }[
                                operator
                              ] ?? operator))()}
                            ${version}
                          </li>`
                      )
                  )}
                </ul>`
              : null,
          valuesArePackageNames: true,
        },
        {
          heading: "Conflicts with",
          value:
            packageInfo.conflicts_with &&
            Object.keys(packageInfo.conflicts_with).length
              ? Object.entries(packageInfo.conflicts_with).flatMap(
                  ([, identifiers]: [string, string[]]) => identifiers
                )
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
