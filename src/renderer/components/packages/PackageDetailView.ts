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
  getCaskAppFileName,
  installPackage,
  uninstallPackage,
  upgradePackage,
} from "./package-events";

@customElement("openstore-package-detail-view")
export default class PackageDetailView<PackageInfo> extends ProductView {
  @property({ attribute: false })
  packageInfo: PackageInfo;

  private get packageManagerName(): string {
    return (window as any).openStore.decodeFragment(window.location.hash)
      .source;
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
    return !!packageManagerForName(this.packageManagerName).info(packageName);
  }

  protected get fields(): PackageDetailField[][] {
    return this.packageInfoAdapter.packageDetails(this.packageInfo);
  }

  protected get buttons(): Button[] {
    const packageIdentifier = this.packageInfoAdapter.packageIdentifier(
      this.packageInfo
    );

    return [
      {
        title: "Install",
        color: "success",

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
        title: "Launch",
        color: "primary",

        shown:
          this.packageInfoAdapter.isPackageInstalled(this.packageInfo) &&
          !!getCaskAppFileName(this.packageInfo),

        enabled: !taskQueue.liveForPackage(packageIdentifier).length,

        onClick: async () => {
          const appFileName = getCaskAppFileName(this.packageInfo);
          if (appFileName) await window.openProduct.openApp(appFileName);
        },
      },
      {
        title: "Update",
        color: "success",

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
      },
    ];
  }
}
