import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import TerminalButton from "components/terminal/TerminalButton";
import { css, html, HTMLTemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { QueuedTask, TaskState, TaskType } from "./model/Task";
import taskQueue, { TaskQueueObserver } from "./model/TaskQueue";

@customElement("openstore-tasks-pane")
export class TasksPane extends BootstrapBlockElement {
  @state()
  tasks: QueuedTask[] = [];

  private taskQueueObserver: TaskQueueObserver;

  connectedCallback(): void {
    super.connectedCallback();

    this.taskQueueObserver = this.taskQueueChanged.bind(this);
    taskQueue.addObserver(this.taskQueueObserver);
  }
  disconnectedCallback(): void {
    super.disconnectedCallback();

    taskQueue.removeObserver(this.taskQueueObserver);
  }

  private taskQueueChanged() {
    this.tasks = [...taskQueue.allTasks];
    this.tasks.reverse();
    this.requestUpdate();
  }

  static styles = [
    BootstrapBlockElement.styles,
    css`
      .task-pane-heading {
        font-size: 1.2rem;
        font-weight: normal;
      }
      .task-list {
        height: 100%;
        overflow: auto;
        box-sizing: border-box;
      }
    `,
  ];

  constructor() {
    super();
  }

  get terminalButton(): TerminalButton {
    return this.renderRoot.querySelector("openstore-terminal-button");
  }

  render() {
    return html`${BootstrapBlockElement.styleLink}

      <div
        class="d-flex align-items-center justify-content-between border-bottom mx-2 pb-2"
      >
        <h2 class="task-pane-heading text-center mt-2">Tasks</h2>
        <openstore-terminal-button></openstore-terminal-button>
      </div>

      ${this.tasks.length
        ? html`
            <ul class="task-list mt-1 ps-2 pe-4">
              ${repeat(
                this.tasks,
                (task) => html`
                  <openstore-tasks-pane-task
                    .label=${task.label}
                    .statusDescription=${this.statusDescriptionForTask(task)}
                    .statusColor=${this.statusColorForTask(task)}
                    class="my-2"
                  ></openstore-tasks-pane-task>
                `
              )}
            </ul>
          `
        : html`
            <p class="text-center mt-1">
              <span class="fs-2">😴</span>
              <br />
              Pending, running, and completed install/update/uninstall tasks
              will show up here
            </p>
          `} `;
  }

  private statusDescriptionForTask(task: QueuedTask): string {
    switch (task.state) {
      case "pending":
        return "Waiting…";
      case "running":
        return "Running…";
      case "cancelled":
        return "Cancelled";
      case "failed":
        return "Failed";
      case "succeeded":
        return "Completed";
    }
  }

  private statusColorForTask(task: QueuedTask): string {
    switch (task.state) {
      case "pending":
        return "secondary";
      case "running":
        return "primary";
      case "cancelled":
        return "warning";
      case "failed":
        return "danger";
      case "succeeded":
        return "success";
    }
  }
}

@customElement("openstore-tasks-pane-task")
export class TasksPaneTask extends BootstrapBlockElement {
  @property()
  label = "";
  @property()
  statusDescription: string = "";
  @property()
  statusColor: string = "muted";

  static styles = [BootstrapBlockElement.styles];

  render() {
    return html`${BootstrapBlockElement.styleLink}

      <div class="d-flex align-items-center justify-content-between">
        <div class="d-flex flex-column">
          <strong class="flex-grow-1 lh-sm">${this.label}</strong>
          <span class="text-${this.statusColor}"
            >${this.statusDescription}</span
          >
        </div>
        <div
          class="spinner-border spinner-border-sm ${[
            "primary",
            "secondary",
          ].includes(this.statusColor)
            ? `text-${this.statusColor}`
            : "invisible"}"
          role="status"
        ></div>
      </div> `;
  }
}
