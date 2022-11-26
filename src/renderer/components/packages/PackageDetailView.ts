import { Button, ProductView } from "components/packages/ProductView";
import { packageIdentifiersOfTask, QueuedTask } from "tasks/Task";
import taskQueue from "tasks/TaskQueue";
import { customElement, property } from "lit/decorators.js";
import {
  PackageDetailField,
  PackageInfoAdapter,
} from "package-manager/PackageInfoAdapter";
import {
  packageInfoAdapterForPackageManagerName,
  packageManagerForName,
} from "package-manager/PackageManagerRegistry";
import {
  installPackage,
  uninstallPackage,
  upgradePackage,
} from "./package-events";
import { IPCPackageManager } from "ipc/package-managers/IPCPackageManager";
import { html } from "lit";

@customElement("openstore-package-detail-view")
export default class PackageDetailView<PackageInfo> extends ProductView {
  @property({ attribute: false })
  packageInfo: PackageInfo;

  private get packageManagerName(): string {
    return (window as any).openStore.decodeFragment(window.location.hash)
      .source;
  }

  private get packageManager(): IPCPackageManager<PackageInfo, any> {
    return packageManagerForName(this.packageManagerName) as any;
  }

  private get packageInfoAdapter(): PackageInfoAdapter<PackageInfo> {
    return packageInfoAdapterForPackageManagerName(this.packageManagerName);
  }

  protected get subtitle(): string {
    const name = this.packageInfoAdapter.packageName(this.packageInfo);
    const identifier = this.packageInfoAdapter.packageIdentifier(
      this.packageInfo
    );
    return identifier !== name ? identifier : "";
  }

  protected get description(): string {
    return this.packageInfoAdapter.packageDescription(this.packageInfo);
  }

  protected get sourceRepositoryName(): string {
    return this.packageInfoAdapter.packageSourceRepsitoryName(this.packageInfo);
  }

  protected get publisher(): string | undefined {
    return this.packageInfoAdapter.packagePublisher(this.packageInfo);
  }

  protected get websiteURL(): string | undefined {
    return this.packageInfoAdapter.packageWebsiteURL(this.packageInfo);
  }

  protected shouldCauseRerender({ task: successfulTask }: QueuedTask): boolean {
    return (
      packageIdentifiersOfTask(successfulTask)?.includes(
        this.packageInfoAdapter.packageIdentifier(this.packageInfo)
      ) ?? false
    );
  }

  protected canLinkToPackageName(packageName: string): boolean {
    return !!this.packageManager.info(packageName);
  }

  protected get fields(): PackageDetailField[][] {
    return this.packageInfoAdapter.packageDetails(this.packageInfo);
  }

  private static installIcon = html`
    <svg
      style="margin-bottom: 2px"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      class="bi bi-download"
      viewBox="0 0 16 16"
    >
      <path
        d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"
      />
      <path
        d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"
      />
    </svg>
  `;
  private static updateIcon = html`
    <svg
      style="margin-bottom: 3px"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      class="bi bi-arrow-down"
      viewBox="0 0 16 16"
    >
      <path
        fill-rule="evenodd"
        d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"
      />
    </svg>
  `;
  private static relaunchIcon = html`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      class="bi bi-arrow-clockwise"
      viewBox="0 0 16 16"
    >
      <path
        fill-rule="evenodd"
        d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"
      />
      <path
        d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"
      />
    </svg>
  `;
  private static launchIcon = html`
    <svg
      style="transform: scale(0.9) translateY(-2px)"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      class="bi bi-box-arrow-up-right"
      viewBox="0 0 16 16"
    >
      <path
        fill-rule="evenodd"
        d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"
      />
      <path
        fill-rule="evenodd"
        d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"
      />
    </svg>
  `;
  private static uninstallIcon = html`
    <svg
      style="transform: scale(1.6) translateY(-0.75px)"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      class="bi bi-x"
      viewBox="0 0 16 16"
    >
      <path
        d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"
      />
    </svg>
  `;

  protected async buttons(): Promise<Button[]> {
    const packageIdentifier = this.packageInfoAdapter.packageIdentifier(
      this.packageInfo
    );
    const [mainLaunchable, ...additionalLaunchables] =
      this.packageInfoAdapter.isPackageInstalled(this.packageInfo)
        ? await this.packageManager.launchables(this.packageInfo)
        : [];

    return [
      {
        title: "Install",
        icon: PackageDetailView.installIcon,
        color: "primary",

        shown:
          !this.packageInfoAdapter.isPackageInstalled(this.packageInfo) &&
          !this.packageInfoAdapter.isPackageDisabled(this.packageInfo),

        enabled: !taskQueue.liveForPackage(packageIdentifier).length,
        loading: !!taskQueue.liveForPackage(packageIdentifier, "install")
          .length,

        onClick: () =>
          installPackage(
            this.packageManagerName,
            packageIdentifier,
            this.packageInfoAdapter.packageName(this.packageInfo)
          ),
      },
      {
        title: "Relaunch",
        icon: PackageDetailView.relaunchIcon,
        color: "success",

        shown: this.packageInfoAdapter.isPackageOvert(this.packageInfo),

        enabled: !taskQueue.liveForPackage(packageIdentifier).length,

        onClick: async () => {
          window.lifecycle.relaunch();
        },
      },
      {
        title: !additionalLaunchables.length
          ? "Launch"
          : `Launch ${mainLaunchable.label}`,
        icon: PackageDetailView.launchIcon,
        color: "success",

        shown:
          !this.packageInfoAdapter.isPackageOvert(this.packageInfo) &&
          this.packageInfoAdapter.isPackageInstalled(this.packageInfo) &&
          !!mainLaunchable,

        enabled: !taskQueue.liveForPackage(packageIdentifier).length,

        onClick: async () => {
          await window.openProduct.openApp(mainLaunchable.path);
        },

        moreActions: additionalLaunchables.map(({ path, label }) => ({
          title: `Launch ${label}`,
          color: "success",

          shown: true,

          enabled: !taskQueue.liveForPackage(packageIdentifier).length,

          onClick: async () => {
            await window.openProduct.openApp(path);
          },
        })),
      },
      {
        title: "Update",
        icon: PackageDetailView.updateIcon,
        color: "primary",

        shown:
          this.packageInfoAdapter.isPackageInstalled(this.packageInfo) &&
          this.packageInfoAdapter.isPackageOutdated(this.packageInfo) &&
          !this.packageInfoAdapter.isPackageDisabled(this.packageInfo),

        enabled: !taskQueue.liveForPackage(packageIdentifier).length,
        loading: !!taskQueue.liveForPackage(packageIdentifier, "upgrade")
          .length,

        onClick: () =>
          upgradePackage(
            this.packageManagerName,
            packageIdentifier,
            this.packageInfoAdapter.packageName(this.packageInfo)
          ),
      },
      {
        title: "Uninstall",
        icon: PackageDetailView.uninstallIcon,
        color: "danger",

        shown: this.packageInfoAdapter.isPackageInstalled(this.packageInfo),

        enabled: !taskQueue.liveForPackage(packageIdentifier).length,
        loading: !!taskQueue.liveForPackage(packageIdentifier, "uninstall")
          .length,

        onClick: () =>
          uninstallPackage(
            this.packageManagerName,
            packageIdentifier,
            this.packageInfoAdapter.packageName(this.packageInfo)
          ),

        moreActions: [
          {
            title: html`Zap
              <small>(Uninstall + Trash Caches & Preferences)</small>`,
            color: "danger",

            shown: this.packageManager.supportsZapUninstall ?? false,

            enabled: !taskQueue.liveForPackage(packageIdentifier).length,
            loading: !!taskQueue.liveForPackage(packageIdentifier, "uninstall")
              .length,

            onClick: () =>
              uninstallPackage(
                this.packageManagerName,
                packageIdentifier,
                this.packageInfoAdapter.packageName(this.packageInfo),
                {
                  zap: true,
                }
              ),
          },
        ],
      },
    ];
  }
}
