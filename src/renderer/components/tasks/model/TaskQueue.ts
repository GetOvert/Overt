import {
  DeadTaskState,
  LiveTaskState,
  QueuedTask,
  Task,
  TaskNotifyPoints,
  TaskType,
} from "./Task";

export type TaskQueueObserver = (taskWithStateChanged: QueuedTask) => void;

export class TaskQueue {
  private _observers: Set<TaskQueueObserver> = new Set();

  addObserver(newObserver: TaskQueueObserver) {
    this._observers.add(newObserver);
  }
  removeObserver(oldObserver: TaskQueueObserver) {
    this._observers.delete(oldObserver);
  }

  private notifyObservers(taskWithStateChanged: QueuedTask) {
    for (const observer of this._observers) {
      observer(taskWithStateChanged);
    }
  }

  private _liveQueue: QueuedTask[] = [];
  private _liveAndDeadQueue: QueuedTask[] = [];
  private _tasksBySerial: Map<number, QueuedTask> = new Map();
  private _lastSerial = 1;

  get liveTasks(): readonly QueuedTask[] {
    return this._liveQueue;
  }
  get allTasks(): readonly QueuedTask[] {
    return this._liveAndDeadQueue;
  }

  nextOfTypes(taskTypes: TaskType[]): QueuedTask | null {
    const task =
      this._liveQueue.find(
        ({ task, state }) =>
          state === "pending" && taskTypes.includes(task.type)
      ) ?? null;
    if (!task) return null;

    this.update(task, "running");

    return task;
  }

  push(
    task: Task,
    notify: TaskNotifyPoints = [],
    state: LiveTaskState = "pending"
  ) {
    const queuedTask: QueuedTask = {
      task,
      serial: this._lastSerial++,
      state,
      notify,
    };

    this._liveQueue.push(queuedTask);
    this._liveAndDeadQueue.push(queuedTask);
    this._tasksBySerial.set(queuedTask.serial, queuedTask);

    this.notifyObservers(queuedTask);
  }

  update(taskOrTaskSerial: QueuedTask | number, state: LiveTaskState) {
    const task =
      typeof taskOrTaskSerial === "number"
        ? this._tasksBySerial.get(taskOrTaskSerial)
        : taskOrTaskSerial;
    if (!task) return;

    task.state = state;

    this.notifyObservers(task);
  }

  remove(taskOrTaskSerial: QueuedTask | number, state: DeadTaskState) {
    const task =
      typeof taskOrTaskSerial === "number"
        ? this._tasksBySerial.get(taskOrTaskSerial)
        : taskOrTaskSerial;
    if (!task) return;

    const taskIndex = this._liveQueue.findIndex(
      (t) => t.serial === task.serial
    );
    if (taskIndex === -1) return;

    task.state = state;

    this._liveQueue.splice(taskIndex, 1);

    this.notifyObservers(task);
  }
}

const taskQueue = new TaskQueue();
export default taskQueue;

window.taskQueueIPC.onTaskQueueCreated(taskQueue.push.bind(taskQueue));
