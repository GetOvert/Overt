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
  aliases?: string[];
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
    // FIXME: This is only a heuristic
    return !Object.values(packageInfo.versions).includes(
      packageInfo.installed[0]?.version
    );
  }

  packageDetails(packageInfo: BrewPackageInfo): PackageDetailField[] {
    return [
      {
        heading: "Description",
        value: packageInfo.desc ?? "No description available.",
      },
      {
        heading: "Website",
        value: html`<p>
          <a
            href=${packageInfo.homepage}
            @click=${(e) => {
              e.preventDefault();
              window.openExternalLink.open(packageInfo.homepage);
            }}
            >${packageInfo.homepage}</a
          >
        </p>`,
      },
      {
        heading: "Versions",
        value: html`<dl>
          <dt>Installed:</dt>
          <dd>${packageInfo.installed?.[0]?.version ?? "None"}</dd>
          <dt>Latest stable:</dt>
          <dd>${packageInfo.versions?.stable ?? "None"}</dd>
        </dl>`,
      },
      {
        heading: "Dependencies",
        value: packageInfo.dependencies?.length
          ? html`<ul>
              ${repeat(
                packageInfo.dependencies,
                (dependencyIdentifier) => html`<li>${dependencyIdentifier}</li>`
              )}
            </ul>`
          : null,
      },
      {
        heading: "Recommended ependencies",
        value: packageInfo.recommended_dependencies?.length
          ? html`<ul>
              ${repeat(
                packageInfo.recommended_dependencies,
                (dependencyIdentifier) => html`<li>${dependencyIdentifier}</li>`
              )}
            </ul>`
          : null,
      },
      {
        heading: "Optional dependencies",
        value: packageInfo.optional_dependencies?.length
          ? html`<ul>
              ${repeat(
                packageInfo.optional_dependencies,
                (dependencyIdentifier) => html`<li>${dependencyIdentifier}</li>`
              )}
            </ul>`
          : null,
      },
      {
        heading: "Identifiers",
        value: [packageInfo.full_name, ...(packageInfo.aliases ?? [])].join(
          ", "
        ),
      },
      {
        heading: "Install count",
        value: [
          `30 days: ${(+packageInfo.installed_30d).toLocaleString()}`,
          `90 days: ${(+packageInfo.installed_90d).toLocaleString()}`,
          `365 days: ${(+packageInfo.installed_365d).toLocaleString()}`,
        ],
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
