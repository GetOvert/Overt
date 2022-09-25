import { isDeadTaskState, isLiveTaskState, QueuedTask } from "./model/Task";
import taskQueue from "./model/TaskQueue";
import TasksButton from "./TasksButton";

taskQueue.addObserver(async (task: QueuedTask) => {
  if (!(await window.settings.get("sendNativeNotifications"))) return;

  if (isLiveTaskState(task.state) && task.notify.includes("before")) {
    switch (task.state) {
      case "running":
        new Notification(task.label, { body: "⏱ Started" }).onclick =
          onNotificationClicked;
        break;
    }
  }
  if (isDeadTaskState(task.state) && task.notify.includes("after")) {
    switch (task.state) {
      case "failed":
        new Notification(task.label, { body: "❌ Failed" }).onclick =
          onNotificationClicked;
        break;
      case "succeeded":
        new Notification(task.label, { body: "✅ Completed" }).onclick =
          onNotificationClicked;
        break;
    }
  }
});

function onNotificationClicked() {
  (document.querySelector("openstore-tasks-button") as TasksButton).showPane();
}
