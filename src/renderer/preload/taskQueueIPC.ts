import { Task } from "components/tasks/model/Task";
import { IPCTaskQueue } from "ipc/IPCTaskQueue";

export let push: (task: Task) => void;

export default {
  onTaskQueueCreated(pushFn) {
    push = pushFn;
  },
} as IPCTaskQueue;
