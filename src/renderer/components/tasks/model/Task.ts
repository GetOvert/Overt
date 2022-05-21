import { PackageManager } from "package-manager/SourceRepository";

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
  | "reindex-all"
  | "reindex-outdated"
  | "reindex"
  | "install"
  | "upgrade"
  | "uninstall";

export type PromptForPasswordTask = Task & {
  type: "prompt-for-password";
  prompt: string;
};

export type PackageManagerTask = Task & {
  packageManager: string;
};
export type ReindexAllTask = PackageManagerTask & {
  type: "reindex-all";
  condition?: "always" | "if-too-old" | "if-nonexistent";
  wipeIndexFirst?: boolean;
};
export type ReindexOutdatedTask = PackageManagerTask & {
  type: "reindex-outdated";
};
export type ReindexTask = PackageManagerTask & {
  type: "reindex";
  packageIdentifiers: string[];
};
export type InstallTask = PackageManagerTask & {
  type: "install";
  packageIdentifier: string;
};
export type UpgradeTask = PackageManagerTask & {
  type: "upgrade";
  packageIdentifier: string;
};
export type UninstallTask = PackageManagerTask & {
  type: "uninstall";
  packageIdentifier: string;
};
export function packageIdentifiersOfTask(task: Task): string[] | null {
  return "packageIdentifier" in task
    ? [(task as any).packageIdentifier]
    : "packageIdentifiers" in task
    ? (task as any).packageIdentifiers
    : null;
}
