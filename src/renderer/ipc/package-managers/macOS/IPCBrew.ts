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
  installed_30d?: string; // TODO: Better typing
  installed_90d?: string; // TODO: Better typing
  installed_365d?: string; // TODO: Better typing
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

  packageDetails(packageInfo: BrewPackageInfo): PackageDetailField[] {
    return [
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
        heading: "Description",
        value: packageInfo.desc ?? "No description available.",
      },
      {
        heading: "Website",
        value: html`<p>
          <a
            href=${packageInfo.homepage}
            @click=${(e: Event) => {
              e.preventDefault();
              window.openExternalLink.open(packageInfo.homepage);
            }}
            >${packageInfo.homepage}</a
          >
        </p>`,
      },
      {
        heading: "Versions",
        value: {
          Installed: packageInfo.installed?.[0]?.version ?? "None",
          "Latest stable": packageInfo.versions?.stable ?? "None",
        },
      },
      {
        heading: "Dependencies",
        value: packageInfo.dependencies,
      },
      {
        heading: "Recommended dependencies",
        value: packageInfo.recommended_dependencies,
      },
      {
        heading: "Optional dependencies",
        value: packageInfo.optional_dependencies,
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
      },
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
        heading: "Install-on-request count",
        value: {
          "30 days": (+packageInfo.installed_30d!).toLocaleString(),
          "90 days": (+packageInfo.installed_90d!).toLocaleString(),
          "365 days": (+packageInfo.installed_365d!).toLocaleString(),
        },
      },
    ];
  }
}

export type SortKey =
  | "installed-30d"
  | "installed-90d"
  | "installed-365d"
  | "updated"
  | "added";
