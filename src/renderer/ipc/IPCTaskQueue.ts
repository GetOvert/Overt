import { TaskBase, TaskNotifyPoints } from "tasks/Task";

declare global {
  interface Window {
    taskQueueIPC: IPCTaskQueue;
  }
}

export interface IPCTaskQueue {
  onTaskQueueCreated(
    push: <Task extends TaskBase = TaskBase>(
      task: Task,
      notify: TaskNotifyPoints
    ) => void
  ): Promise<void>;

  onTaskQueueDrained(): void;
}
