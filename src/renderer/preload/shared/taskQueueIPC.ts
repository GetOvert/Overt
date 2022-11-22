import { TaskBase, TaskNotifyPoints } from "tasks/Task";
import { IPCTaskQueue } from "ipc/IPCTaskQueue";

export let push: <Task extends TaskBase = TaskBase>(
  task: Task,
  notify: TaskNotifyPoints
) => void;

let drainedPromise: Promise<void> | undefined;
let drainedPromiseResolve: (() => void) | undefined;
export function waitUntilDrained(): Promise<void> {
  return (drainedPromise ??= new Promise((resolve, reject) => {
    drainedPromiseResolve = resolve;
  }));
}

export default {
  onTaskQueueCreated(pushFn) {
    push = pushFn;
  },

  onTaskQueueDrained() {
    drainedPromiseResolve?.();
    drainedPromise = undefined;
    drainedPromiseResolve = undefined;
  },
} as IPCTaskQueue;
