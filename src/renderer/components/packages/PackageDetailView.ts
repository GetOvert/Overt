import { Button, ProductView } from "components/packages/ProductView";
import {
  packageIdentifiersOfTask,
  QueuedTask,
} from "components/tasks/model/Task";
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
  packageInfo: any = {};

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

  protected shouldCauseRerender({ task: successfulTask }: QueuedTask): boolean {
    return (
      (["reindex-all", "reindex"].includes(successfulTask.type) &&
        packageIdentifiersOfTask(successfulTask)?.includes(
          this.packageInfoAdapter.packageIdentifier(this.packageInfo)
        )) ??
      false
    );
  }

  protected canLinkToPackageName(packageName: string): boolean {
    return !!packageManagerForName(this.packageManagerName).info(packageName);
  }

  protected get fields(): PackageDetailField[] {
    return this.packageInfoAdapter.packageDetails(this.packageInfo);
  }

  protected get buttons(): Button[] {
    return [
      {
        title: "Install",
        color: "success",
        shown:
          !this.packageInfoAdapter.isPackageInstalled(this.packageInfo) &&
          !this.packageInfoAdapter.isPackageDisabled(this.packageInfo),
        onClick: () =>
          installPackage(
            this.packageManagerName,
            this.packageInfoAdapter.packageIdentifier(this.packageInfo),
            this.packageInfoAdapter.packageName(this.packageInfo)
          ),
      },
      {
        title: "Launch",
        color: "primary",
        shown:
          this.packageInfoAdapter.isPackageInstalled(this.packageInfo) &&
          !!getCaskAppFileName(this.packageInfo),
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
        onClick: () =>
          upgradePackage(
            this.packageManagerName,
            this.packageInfoAdapter.packageIdentifier(this.packageInfo),
            this.packageInfoAdapter.packageName(this.packageInfo)
          ),
      },
      {
        title: "Uninstall",
        color: "danger",
        shown: this.packageInfoAdapter.isPackageInstalled(this.packageInfo),
        onClick: () =>
          uninstallPackage(
            this.packageManagerName,
            this.packageInfoAdapter.packageIdentifier(this.packageInfo),
            this.packageInfoAdapter.packageName(this.packageInfo)
          ),
      },
    ];
  }
}
