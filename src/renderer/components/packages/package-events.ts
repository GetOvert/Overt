import {
  InstallTask,
  ReindexTask,
  UninstallTask,
  UpgradeTask,
} from "tasks/Task";
import taskQueue from "tasks/TaskQueue";

export async function installPackage(
  packageManager: string,
  packageIdentifier: string,
  packageFullName: string
) {
  taskQueue.push(
    {
      packageManager,
      label: `Install ${packageIdentifier}`,
      type: "install",
      packageIdentifier,
    } as InstallTask,
    ["before", "after"]
  );
}

export async function upgradePackage(
  packageManager: string,
  packageIdentifier: string,
  packageFullName: string
) {
  taskQueue.push(
    {
      packageManager: packageManager,
      label: `Update ${packageIdentifier}`,
      type: "upgrade",
      packageIdentifier,
    } as UpgradeTask,
    ["before", "after"]
  );
}

export async function uninstallPackage(
  packageManager: string,
  packageIdentifier: string,
  packageFullName: string,
  { zap }: { zap?: boolean } = {}
) {
  taskQueue.push(
    {
      packageManager,
      label: `Uninstall ${packageIdentifier}`,
      type: "uninstall",
      packageIdentifier,
      zap,
    } as UninstallTask,
    ["before", "after"]
  );
}

export async function reindexPackage(
  packageManager: string,
  packageIdentifier: string,
  packageFullName: string
) {
  taskQueue.push(
    {
      packageManager,
      label: `Index ${packageIdentifier}`,
      type: "reindex",
      packageIdentifiers: [packageIdentifier],
    } as ReindexTask,
    ["before", "after"]
  );
}

window.contextMenu.setCallback("install", installPackage);
window.contextMenu.setCallback("upgrade", upgradePackage);
window.contextMenu.setCallback("uninstall", uninstallPackage);
window.contextMenu.setCallback("reindex", reindexPackage);
