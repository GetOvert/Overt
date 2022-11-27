import { html } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { packageManagerForName } from "package-manager/PackageManagerRegistry";
import ActionConfirmationModal from "components/modal/ActionConfirmationModal";
import PasswordPromptModal from "components/modal/PasswordPromptModal";
import {
  packageIdentifiersOfTask,
  ReindexTask,
  QueuedTask,
  TaskType,
  Task,
  DeadTaskState,
} from "../Task";
import taskQueue from "../TaskQueue";

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
      typeof task.promptCannedMessage === "string"
        ? html`${unsafeHTML(task.promptCannedMessage)}`
        : task.promptCannedMessage,
      task.url,
      task.promptTitle,
      task.openLinkButtonTitle,
      task.confirmButtonTitle,
      task.cancelButtonTitle
    );

    if (!shouldContinue) {
      task.cancel?.();
      return "canceled";
    }

    task.action();
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
        await packageManager.indexOutdated();
        success = true;
        break;
      case "reindex":
        await packageManager.indexSpecific(task.packageIdentifiers);
        success = true;
        break;
      case "reindex-source-repositories":
        await packageManager.indexSourceRepositories();
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
        success = await packageManager.uninstall(task.packageIdentifier, {
          zap: task.zap,
        });
        break;
    }

    taskQueue.push<ReindexTask>({
      type: "reindex",
      label: `Index ${packageIdentifiersOfTask(task)}`,
      packageManager: packageManagerName,
      packageIdentifiers: packageIdentifiersOfTask(task) ?? [],
    });

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
