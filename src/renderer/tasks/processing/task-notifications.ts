import { isDeadTaskState, isLiveTaskState, QueuedTask } from "../Task";
import taskQueue from "../TaskQueue";
import TasksButton from "../../components/tasks/TasksButton";

taskQueue.addObserver(async (queuedTask: QueuedTask) => {
  if (!(await window.settings.get("sendNativeNotifications"))) return;

  if (
    isLiveTaskState(queuedTask.state) &&
    queuedTask.notify.includes("before")
  ) {
    switch (queuedTask.state) {
      case "running":
        new Notification(queuedTask.task.label, {
          body: "⏱ Started",
          silent: true,
        }).onclick = onNotificationClicked;
        break;
    }
  }
  if (
    isDeadTaskState(queuedTask.state) &&
    queuedTask.notify.includes("after")
  ) {
    switch (queuedTask.state) {
      case "failed":
        new Notification(queuedTask.task.label, {
          body: "❌ Failed",
          silent: true,
        }).onclick = onNotificationClicked;
        break;
      case "succeeded":
        new Notification(queuedTask.task.label, {
          body: "✅ Completed",
          silent: true,
        }).onclick = onNotificationClicked;
        break;
    }
  }
});

function onNotificationClicked() {
  (document.querySelector("openstore-tasks-button") as TasksButton).showPane();
}
