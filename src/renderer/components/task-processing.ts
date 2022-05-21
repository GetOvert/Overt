import { packageManagerForName } from "package-manager/PackageManagerRegistry";
import PasswordPromptModal from "./modal/PasswordPromptModal";
import {
  packageIdentifiersOfTask,
  InstallTask,
  ReindexAllTask,
  ReindexTask,
  UninstallTask,
  UpgradeTask,
  PromptForPasswordTask,
  QueuedTask,
  TaskType,
  PackageManagerTask,
} from "./tasks/model/Task";
import taskQueue from "./tasks/model/TaskQueue";

class TaskProcessor {
  constructor(
    private _taskTypes: TaskType[],
    private _process: (task: QueuedTask) => Promise<void>
  ) {
    taskQueue.addObserver(this.startProcessingIfNeeded.bind(this));
  }

  private _processing = false;

  private async startProcessingIfNeeded() {
    if (this._processing) return;
    this._processing = true;

    let task: QueuedTask;
    try {
      while ((task = taskQueue.nextOfTypes(this._taskTypes))) {
        await this._process(task);
      }
    } catch (error) {
      console.error(error);
      if (task) taskQueue.remove(task, "failed");
    } finally {
      this._processing = false;
    }
  }
}

const promptForPasswordProcessor = new TaskProcessor(
  ["prompt-for-password"],
  async (task: QueuedTask) => {
    try {
      const password = await PasswordPromptModal.runModal(
        (task as unknown as PromptForPasswordTask).prompt
      );

      window.terminal.send(password + "\n");
      taskQueue.remove(task, "succeeded");
    } catch (error) {
      window.terminal.send(String.fromCodePoint(3)); // Ctrl+C

      throw error;
    }
  }
);

const reindexProcessor = new TaskProcessor(
  ["reindex-all", "reindex-outdated", "reindex"],
  async (task: QueuedTask) => {
    const packageManagerName = (task as unknown as PackageManagerTask)
      .packageManager;
    const packageManager = packageManagerForName(packageManagerName);

    let success = false;
    switch (task.type) {
      case "reindex-all":
        const reindexAll = task as unknown as ReindexAllTask;
        await packageManager.rebuildIndex(
          reindexAll.condition,
          reindexAll.wipeIndexFirst
        );
        success = true;
        break;
      case "reindex-outdated":
        await packageManager.reindexOutdated();
        success = true;
        break;
      case "reindex":
        await packageManager.updateIndex(
          (task as unknown as ReindexTask).packageIdentifiers
        );
        success = true;
        break;
    }

    taskQueue.remove(task, success ? "succeeded" : "failed");
  }
);

const packageActionsProcessor = new TaskProcessor(
  ["install", "upgrade", "uninstall"],
  async (task: QueuedTask) => {
    const packageManagerName = (task as unknown as PackageManagerTask)
      .packageManager;
    const packageManager = packageManagerForName(packageManagerName);

    let success = false;
    switch (task.type) {
      case "install":
        success = await packageManager.install(
          (task as unknown as InstallTask).packageIdentifier
        );
        break;
      case "upgrade":
        success = await packageManager.upgrade(
          (task as unknown as UpgradeTask).packageIdentifier
        );
        break;
      case "uninstall":
        success = await packageManager.uninstall(
          (task as unknown as UninstallTask).packageIdentifier
        );
        break;
    }

    taskQueue.remove(task, success ? "succeeded" : "failed");

    taskQueue.push({
      type: "reindex",
      label: `Index ${packageIdentifiersOfTask(task)}`,
      packageManager: packageManagerName,
      packageIdentifiers: packageIdentifiersOfTask(task),
    } as ReindexTask);
  }
);
