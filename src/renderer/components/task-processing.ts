import { html } from "lit";
import { packageManagerForName } from "package-manager/PackageManagerRegistry";
import ActionConfirmationModal from "./modal/ActionConfirmationModal";
import PasswordPromptModal from "./modal/PasswordPromptModal";
import {
  packageIdentifiersOfTask,
  ReindexTask,
  QueuedTask,
  TaskType,
  Task,
  DeadTaskState,
} from "./tasks/model/Task";
import taskQueue from "./tasks/model/TaskQueue";

class TaskProcessor<TaskTypes extends TaskType[]> {
  constructor(
    private _taskTypes: TaskTypes,
    private _process: (
      task: Task & { type: TaskTypes[number] }
    ) => Promise<DeadTaskState>
  ) {
    taskQueue.addObserver(this.startProcessingIfNeeded.bind(this));
  }

  private _processing = false;

  private async startProcessingIfNeeded() {
    if (this._processing) return;
    this._processing = true;

    let queuedTask: QueuedTask | null = null;
    try {
      while ((queuedTask = taskQueue.nextOfTypes(this._taskTypes))) {
        taskQueue.remove(queuedTask, await this._process(queuedTask.task));
      }
    } catch (error) {
      console.error(error);
      if (queuedTask) taskQueue.remove(queuedTask, "failed");
    } finally {
      this._processing = false;
    }
  }
}

const promptForPasswordProcessor = new TaskProcessor(
  ["prompt-for-password"],
  async (task) => {
    try {
      const password = await PasswordPromptModal.runModal(task.prompt);

      window.terminal.send(password + "\n");
      return "succeeded";
    } catch (error) {
      window.terminal.send(String.fromCodePoint(3)); // Ctrl+C
      throw error;
    }
  }
);

const confirmationProcessor = new TaskProcessor(
  ["confirm-action"],
  async (task) => {
    const shouldContinue = await ActionConfirmationModal.runModal(
      task.prompt,
      html`Do you want to allow this? ${task.promptCannedMessage}`,
      task.url,
      task.promptTitle,
      task.confirmButtonTitle,
      task.cancelButtonTitle
    );
    if (!shouldContinue) return "canceled";

    taskQueue.push(task.action, task.notify);
    return "succeeded";
  }
);

const reindexProcessor = new TaskProcessor(
  ["reindex-all", "reindex-outdated", "reindex", "reindex-source-repositories"],
  async (task) => {
    const packageManagerName = task.packageManager;
    const packageManager = packageManagerForName(packageManagerName);

    let success = false;
    switch (task.type) {
      case "reindex-all":
        await packageManager.rebuildIndex(task.condition, task.wipeIndexFirst);
        success = true;
        break;
      case "reindex-outdated":
        await packageManager.reindexOutdated();
        success = true;
        break;
      case "reindex":
        await packageManager.updateIndex(task.packageIdentifiers);
        success = true;
        break;
      case "reindex-source-repositories":
        await packageManager.reindexSourceRepositories();
        success = true;
        break;
    }

    return success ? "succeeded" : "failed";
  }
);

const packageActionsProcessor = new TaskProcessor(
  ["install", "upgrade", "uninstall"],
  async (task) => {
    const packageManagerName = task.packageManager;
    const packageManager = packageManagerForName(packageManagerName);

    let success = false;
    switch (task.type) {
      case "install":
        success = await packageManager.install(task.packageIdentifier);
        break;
      case "upgrade":
        success = await packageManager.upgrade(task.packageIdentifier);
        break;
      case "uninstall":
        success = await packageManager.uninstall(task.packageIdentifier);
        break;
    }

    taskQueue.push({
      type: "reindex",
      label: `Index ${packageIdentifiersOfTask(task)}`,
      packageManager: packageManagerName,
      packageIdentifiers: packageIdentifiersOfTask(task),
    } as ReindexTask);

    return success ? "succeeded" : "failed";
  }
);

const sourceRepositoryActionsProcessor = new TaskProcessor(
  ["add-source-repository", "remove-source-repository"],
  async (task) => {
    const packageManagerName = task.packageManager;
    const packageManager = packageManagerForName(packageManagerName);

    let success = false;
    switch (task.type) {
      case "add-source-repository":
        success = await packageManager.addSourceRepository(task.name, task.url);
        break;
      case "remove-source-repository":
        success = await packageManager.removeSourceRepository(task.name);
        break;
    }

    return success ? "succeeded" : "failed";
  }
);
