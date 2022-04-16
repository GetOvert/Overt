import {
  CaskInstallTask,
  CaskReindexTask,
  CaskUninstallTask,
  CaskUpgradeTask,
} from "components/tasks/model/Task";
import taskQueue from "components/tasks/model/TaskQueue";

export async function installCaskApp(
  caskIdentifier: string,
  caskFullName: string
) {
  taskQueue.push(
    {
      label: `Install ${caskFullName}`,
      type: "cask-install",
      caskIdentifier,
    } as CaskInstallTask,
    ["before", "after"]
  );
}

export async function upgradeCaskApp(
  caskIdentifier: string,
  caskFullName: string
) {
  taskQueue.push(
    {
      label: `Update ${caskFullName}`,
      type: "cask-upgrade",
      caskIdentifier,
    } as CaskUpgradeTask,
    ["before", "after"]
  );
}

export async function uninstallCaskApp(
  caskIdentifier: string,
  caskFullName: string
) {
  taskQueue.push(
    {
      label: `Uninstall ${caskFullName}`,
      type: "cask-uninstall",
      caskIdentifier,
    } as CaskUninstallTask,
    ["before", "after"]
  );
}

export async function reindexCaskApp(
  caskIdentifier: string,
  caskFullName: string
) {
  taskQueue.push(
    {
      label: `Index ${caskFullName}`,
      type: "cask-reindex",
      caskIdentifiers: [caskIdentifier],
    } as CaskReindexTask,
    ["before", "after"]
  );
}

export function getCaskAppFileName(app: any): string | null {
  return app.artifacts
    .filter((artifact) => Array.isArray(artifact))
    ?.map(
      (candidateArray) =>
        candidateArray.filter(
          (fileName) =>
            typeof fileName.endsWith === "function" && fileName.endsWith(".app")
        )?.[0]
    )?.[0];
}

window.contextMenu.setCallback("cask-install", installCaskApp);
window.contextMenu.setCallback("cask-upgrade", upgradeCaskApp);
window.contextMenu.setCallback("cask-uninstall", uninstallCaskApp);
window.contextMenu.setCallback("cask-reindex", reindexCaskApp);
