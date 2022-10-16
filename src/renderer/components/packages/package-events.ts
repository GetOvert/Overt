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
      label: `Install ${packageFullName}`,
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
      label: `Update ${packageFullName}`,
      type: "upgrade",
      packageIdentifier,
    } as UpgradeTask,
    ["before", "after"]
  );
}

export async function uninstallPackage(
  packageManager: string,
  packageIdentifier: string,
  packageFullName: string
) {
  taskQueue.push(
    {
      packageManager,
      label: `Uninstall ${packageFullName}`,
      type: "uninstall",
      packageIdentifier,
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
      label: `Index ${packageFullName}`,
      type: "reindex",
      packageIdentifiers: [packageIdentifier],
    } as ReindexTask,
    ["before", "after"]
  );
}

// TODO: Deprecate in favor of general (not 'brew-cask'-specific) solution
export function getCaskAppFileName(app: any): string | undefined {
  return app.artifacts
    ?.map((artifact: any) => artifact.app)
    .filter((x: any) => x)
    .map(
      (candidateArray: string[]) =>
        candidateArray.filter(
          (fileName) =>
            typeof fileName.endsWith === "function" && fileName.endsWith(".app")
        )?.[0]
    )[0];
}

window.contextMenu.setCallback("install", installPackage);
window.contextMenu.setCallback("upgrade", upgradePackage);
window.contextMenu.setCallback("uninstall", uninstallPackage);
window.contextMenu.setCallback("reindex", reindexPackage);
