import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import TerminalButton from "components/terminal/TerminalButton";
import {
  css,
  html,
  HTMLTemplateResult,
  PropertyValueMap,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { isLiveTaskState, QueuedTask, TaskState, TaskType } from "./model/Task";
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
      :host {
        display: flex;
        flex-direction: column;
      }
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
    return this.renderRoot.querySelector("openstore-terminal-button")!;
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
            <ul class="task-list my-1 ps-2 pe-0">
              ${repeat(
                this.tasks,
                (queuedTask) => html`
                  <openstore-tasks-pane-task
                    class="my-2"
                    .label=${queuedTask.task.label}
                    .statusDescription=${this.statusDescriptionForTask(
                      queuedTask
                    )}
                    .statusColor=${this.statusColorForTask(queuedTask)}
                    .queued=${isLiveTaskState(queuedTask.state)}
                    .cancelable=${queuedTask.state === "pending"}
                    @cancel=${() => taskQueue.remove(queuedTask, "canceled")}
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
      case "canceled":
        return "Canceled";
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
      case "canceled":
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
  statusDescription = "";
  @property()
  statusColor = "muted";
  @property()
  queued = true;
  @property()
  cancelable = true;

  static styles = [
    BootstrapBlockElement.styles,
    css`
      .spinner-container {
        display: flex;
        align-items: center;

        width: 16px;
      }

      .cancel-button {
        display: none;

        width: 16px;
      }

      .outer:hover .spinner-border {
        display: none;
      }
      .outer:hover .cancel-button {
        display: block;
      }
    `,
  ];

  render() {
    return html`${BootstrapBlockElement.styleLink}

      <div class="outer d-flex align-items-center justify-content-between">
        <div class="d-flex flex-column">
          <strong class="flex-grow-1 lh-sm">${this.label}</strong>
          <span class="text-${this.statusColor}"
            >${this.statusDescription}</span
          >
        </div>
        <div class="spinner-container me-1">
          <div
            class="spinner-border spinner-border-sm ${this.queued
              ? `text-${this.statusColor}`
              : "invisible"}"
            role="status"
          ></div>
          ${this.cancelable
            ? html`
                <button
                  type="button"
                  class="cancel-button btn text-danger shadow-none p-0"
                  @click=${this.cancel}
                >
                  <svg
                    style="transform: scale(1.9) translate(-1px, -1px)"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    class="bi bi-x"
                    viewBox="0 0 16 16"
                  >
                    <path
                      d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"
                    />
                  </svg>
                </button>
              `
            : ""}
        </div>
      </div> `;
  }

  private cancel() {
    this.dispatchEvent(
      new CustomEvent("cancel", {
        composed: true,
      })
    );
  }
}
