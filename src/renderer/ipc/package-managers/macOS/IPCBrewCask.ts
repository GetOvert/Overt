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

export type IPCBrewCask = IPCPackageManager<object, SortKey>;

export type BrewCaskPackageInfo = {
  token: string;
  full_token: string;
  tap: string;
  name: string[];
  version: string;
  desc: string;
  homepage: string;
  installed: string;
  auto_updates?: boolean;
  depends_on?: any; // TODO: Better typing
  conflicts_with?: any; // TODO: Better typing
  aliases?: string[];
  installed_30d?: string; // TODO: Better typing
  installed_90d?: string; // TODO: Better typing
  installed_365d?: string; // TODO: Better typing
  // TODO: There are more fields that aren't here yet
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

  isPackageInstalled(packageInfo: BrewCaskPackageInfo): boolean {
    return !!packageInfo.installed;
  }

  isPackageOutdated(packageInfo: BrewCaskPackageInfo): boolean {
    return (
      !packageInfo.auto_updates && packageInfo.installed !== packageInfo.version
    );
  }

  packageDetails(packageInfo: BrewCaskPackageInfo): PackageDetailField[] {
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
          <dd>${packageInfo.installed ?? "None"}</dd>
          <dt>Latest:</dt>
          <dd>${packageInfo.version}</dd>
          <dt>Updates:</dt>
          <dd>
            ${packageInfo.auto_updates
              ? "Via built-in updater"
              : "Via OpenStore"}
          </dd>
        </dl>`,
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
                ${Object.keys(packageInfo.depends_on.macos ?? {}).map(
                  (operator) =>
                    packageInfo.depends_on.macos[operator].map(
                      (version) =>
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
      },
      {
        heading: "Conflicts with",
        value:
          packageInfo.conflicts_with &&
          Object.keys(packageInfo.conflicts_with).length
            ? html`<ul>
                ${repeat(
                  packageInfo.conflicts_with.cask ?? [],
                  (appIdentifier) => html`<li>${appIdentifier}</li>`
                )}
              </ul>`
            : null,
      },
      {
        heading: "Identifiers",
        value: [packageInfo.full_token, ...(packageInfo.aliases ?? [])].join(
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
