import { TaskBase, TaskNotifyPoints } from "components/tasks/model/Task";
import { IPCTaskQueue } from "ipc/IPCTaskQueue";

export let push: (task: TaskBase, notify: TaskNotifyPoints) => void;

export default {
  onTaskQueueCreated(pushFn) {
    push = pushFn;
  },
} as IPCTaskQueue;
