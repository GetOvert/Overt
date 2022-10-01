import { TaskBase } from "components/tasks/model/Task";

declare global {
  interface Window {
    taskQueueIPC: IPCTaskQueue;
  }
}

export interface IPCTaskQueue {
  onTaskQueueCreated(push: (task: TaskBase) => void): Promise<void>;
}
