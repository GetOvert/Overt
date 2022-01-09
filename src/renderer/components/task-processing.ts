import PasswordPromptModal from "./modal/PasswordPromptModal";
import {
  caskIdentifiersOfTask,
  CaskInstallTask,
  CaskReindexAllTask,
  CaskReindexTask,
  CaskUninstallTask,
  CaskUpgradeTask,
  PromptForPasswordTask,
  QueuedTask,
  TaskType,
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
  ["cask-reindex-all", "cask-reindex"],
  async (task: QueuedTask) => {
    let success = false;
    switch (task.type) {
      case "cask-reindex-all":
        await window.brewCask.rebuildIndex(
          (task as unknown as CaskReindexAllTask).condition
        );
        success = true;
        break;
      case "cask-reindex":
        await window.brewCask.updateIndex(
          (task as unknown as CaskReindexTask).caskIdentifiers
        );
        success = true;
        break;
    }

    taskQueue.remove(task, success ? "succeeded" : "failed");
  }
);

const brewCaskProcessor = new TaskProcessor(
  ["cask-install", "cask-upgrade", "cask-uninstall"],
  async (task: QueuedTask) => {
    let success = false;
    switch (task.type) {
      case "cask-install":
        success = await window.brewCask.install(
          (task as unknown as CaskInstallTask).caskIdentifier
        );
        break;
      case "cask-upgrade":
        success = await window.brewCask.upgrade(
          (task as unknown as CaskUpgradeTask).caskIdentifier
        );
        break;
      case "cask-uninstall":
        success = await window.brewCask.uninstall(
          (task as unknown as CaskUninstallTask).caskIdentifier
        );
        break;
    }

    taskQueue.remove(task, success ? "succeeded" : "failed");

    taskQueue.push({
      type: "cask-reindex",
      label: `Index ${caskIdentifiersOfTask(task)}`,
      caskIdentifiers: caskIdentifiersOfTask(task),
    } as CaskReindexTask);
  }
);
