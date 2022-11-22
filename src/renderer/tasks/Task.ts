import { html, HTMLTemplateResult } from "lit";

export type QueuedTask = {
  task: Task;
  serial: number;
  state: TaskState;
  notify: TaskNotifyPoints;

  private: {
    resolve: (deadTask: QueuedTask & { state: DeadTaskState }) => unknown;
    reject: (error: Error) => unknown;
  };
};

export type TaskState = LiveTaskState | DeadTaskState;
const liveTaskStates = ["pending", "running"] as const;
const deadTaskStates = ["canceled", "succeeded", "failed"] as const;
export type LiveTaskState = typeof liveTaskStates[number];
export type DeadTaskState = typeof deadTaskStates[number];
export function isLiveTaskState(
  taskState: TaskState
): taskState is LiveTaskState {
  return liveTaskStates.includes(taskState as LiveTaskState);
}
export function isDeadTaskState(
  taskState: TaskState
): taskState is DeadTaskState {
  return deadTaskStates.includes(taskState as DeadTaskState);
}

export type TaskNotifyPoints = ("before" | "after")[];

export type Task =
  | PromptForPasswordTask
  | ConfirmActionTask
  | ReindexAllTask
  | ReindexOutdatedTask
  | ReindexTask
  | InstallTask
  | UpgradeTask
  | UninstallTask
  | ReindexSourceRepositoriesTask
  | AddSourceRepositoryTask
  | RemoveSourceRepositoryTask;

export type TaskType = Task["type"];

export type PackageManagerTask =
  | ReindexAllTask
  | ReindexOutdatedTask
  | ReindexTask
  | InstallTask
  | UpgradeTask
  | UninstallTask
  | ReindexSourceRepositoriesTask
  | AddSourceRepositoryTask
  | RemoveSourceRepositoryTask;

export type TaskBase = {
  label: string;
  type: string;
};

export type PromptForPasswordTask = TaskBase & {
  type: "prompt-for-password";
  prompt: string;
};

export type ConfirmActionTask = TaskBase & {
  type: "confirm-action";
  action: () => void;
  cancel?: () => void;

  promptTitle: string;
  prompt: string;
  /** Static HTML below the main message; don't pass user input! */
  promptCannedMessage:
    | HTMLTemplateResult
    | string /* Interpreted as html (for preload code, which can't use html`` literals) */
    | null;
  url?: string | null;
  openLinkButtonTitle?: string;
  confirmButtonTitle: string;
  cancelButtonTitle: string;
};

export type PackageManagerTaskBase = TaskBase & {
  packageManager: string;
};

export type ReindexAllTask = PackageManagerTaskBase & {
  type: "reindex-all";
  condition: "always" | "if-too-old" | "if-nonexistent";
  wipeIndexFirst?: boolean;
};
export type ReindexOutdatedTask = PackageManagerTaskBase & {
  type: "reindex-outdated";
};
export type ReindexTask = PackageManagerTaskBase & {
  type: "reindex";
  packageIdentifiers: string[];
};
export type InstallTask = PackageManagerTaskBase & {
  type: "install";
  packageIdentifier: string;
};
export type UpgradeTask = PackageManagerTaskBase & {
  type: "upgrade";
  packageIdentifier: string;
};
export type UninstallTask = PackageManagerTaskBase & {
  type: "uninstall";
  packageIdentifier: string;
  zap?: boolean;
};
export type ReindexSourceRepositoriesTask = PackageManagerTaskBase & {
  type: "reindex-source-repositories";
};
export type AddSourceRepositoryTask = PackageManagerTaskBase & {
  type: "add-source-repository";
  name: string;
  url: string;
};
export type RemoveSourceRepositoryTask = PackageManagerTaskBase & {
  type: "remove-source-repository";
  name: string;
};

export function packageIdentifiersOfTask(task: Task): string[] | null {
  return "packageIdentifier" in task
    ? [(task as any).packageIdentifier]
    : "packageIdentifiers" in task
    ? (task as any).packageIdentifiers
    : null;
}

export function urlInTask(task: Task): string | null {
  switch (task.type) {
    case "add-source-repository":
      return task.url;
    default:
      return null;
  }
}

export function describeTask(task: Task): string {
  switch (task.type) {
    case "prompt-for-password":
      return `ask for password with prompt "${task.prompt}"`;
    case "confirm-action":
      return `confirm an action`;
    case "reindex-all":
      const condition = (() => {
        switch (task.condition) {
          case "always":
            return "";
          case "if-too-old":
            return " if it is too old";
          case "if-nonexistent":
            return "if it doesn't exist yet";
        }
      })();
      const wipeIndexfirst = task.wipeIndexFirst
        ? ", deleting the old catalog first"
        : "";
      return `rebuild the Overt catalog${condition}${wipeIndexfirst}`;
    case "reindex-outdated":
      return `check for package updates`;
    case "reindex":
      return `index ${task.packageIdentifiers
        .map((id) => `"${id}"`)
        .join(", ")} via ${task.packageManager}`;
    case "install":
      return `install “${task.packageIdentifier}” via ${task.packageManager}`;
    case "upgrade":
      return `update “${task.packageIdentifier}” via ${task.packageManager}`;
    case "uninstall":
      return `uninstall “${task.packageIdentifier}” via ${task.packageManager}`;
    case "reindex-source-repositories":
      return `rebuild source list for ${task.packageManager}`;
    case "add-source-repository":
      return `add a ${task.packageManager} source called “${task.name}”, which is located at ${task.url}`;
    case "remove-source-repository":
      return `remove the ${task.packageManager} source called “${task.name}”`;
  }
}

export function promptCannedMessageForTask(
  task: Task
): HTMLTemplateResult | undefined {
  switch (task.type) {
    case "add-source-repository":
      return html`<strong>Only continue if you trust this source.</strong>`;
  }
}
