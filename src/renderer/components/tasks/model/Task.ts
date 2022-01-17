export type QueuedTask = Task & {
  serial: number;
  state: TaskState;
  notify: TaskNotifyPoints;
};

export type TaskState = LiveTaskState | DeadTaskState;
const liveTaskStates = ["pending", "running"] as const;
const deadTaskStates = ["cancelled", "succeeded", "failed"] as const;
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

export type Task = {
  label: string;
  type: TaskType;
};

export type TaskType =
  | "prompt-for-password"
  | "cask-reindex-all"
  | "cask-reindex"
  | "cask-install"
  | "cask-upgrade"
  | "cask-uninstall";

export type PromptForPasswordTask = Task & {
  type: "prompt-for-password";
  prompt: string;
};
export type CaskReindexAllTask = Task & {
  type: "cask-reindex-all";
  condition: "always" | "if-nonexistent";
};
export type CaskReindexTask = Task & {
  type: "cask-reindex";
  caskIdentifiers: string[];
};
export type CaskInstallTask = Task & {
  type: "cask-install";
  caskIdentifier: string;
};
export type CaskUpgradeTask = Task & {
  type: "cask-upgrade";
  caskIdentifier: string;
};
export type CaskUninstallTask = Task & {
  type: "cask-uninstall";
  caskIdentifier: string;
};
export function caskIdentifiersOfTask(task: Task): string[] | null {
  return "caskIdentifier" in task
    ? [(task as any).caskIdentifier]
    : "caskIdentifiers" in task
    ? (task as any).caskIdentifiers
    : null;
}
