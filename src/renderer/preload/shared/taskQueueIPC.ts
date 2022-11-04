import { TaskBase, TaskNotifyPoints } from "tasks/Task";
import { IPCTaskQueue } from "ipc/IPCTaskQueue";

export let push: <Task extends TaskBase = TaskBase>(
  task: Task,
  notify: TaskNotifyPoints
) => void;

export default {
  onTaskQueueCreated(pushFn) {
    push = pushFn;
  },
} as IPCTaskQueue;
