import { isDeadTaskState, isLiveTaskState, QueuedTask } from "./model/Task";
import taskQueue from "./model/TaskQueue";
import TasksButton from "./TasksButton";

taskQueue.addObserver(async (queuedTask: QueuedTask) => {
  if (!(await window.settings.get("sendNativeNotifications"))) return;

  if (
    isLiveTaskState(queuedTask.state) &&
    queuedTask.notify.includes("before")
  ) {
    switch (queuedTask.state) {
      case "running":
        new Notification(queuedTask.task.label, { body: "⏱ Started" }).onclick =
          onNotificationClicked;
        break;
    }
  }
  if (
    isDeadTaskState(queuedTask.state) &&
    queuedTask.notify.includes("after")
  ) {
    switch (queuedTask.state) {
      case "failed":
        new Notification(queuedTask.task.label, { body: "❌ Failed" }).onclick =
          onNotificationClicked;
        break;
      case "succeeded":
        new Notification(queuedTask.task.label, {
          body: "✅ Completed",
        }).onclick = onNotificationClicked;
        break;
    }
  }
});

function onNotificationClicked() {
  (document.querySelector("openstore-tasks-button") as TasksButton).showPane();
}
