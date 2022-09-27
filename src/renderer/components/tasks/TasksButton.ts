import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import FloatingPane from "components/floating-pane/FloatingPane";
import TerminalButton from "components/terminal/TerminalButton";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { isLiveTaskState } from "./model/Task";
import taskQueue, { TaskQueueObserver } from "./model/TaskQueue";
import { TasksPane } from "./TasksPane";

@customElement("openstore-tasks-button")
export default class TasksButton extends BootstrapBlockElement {
  @state()
  liveTaskCount = 0;

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
    this.liveTaskCount = taskQueue.liveTasks.filter((t) =>
      isLiveTaskState(t.state)
    ).length;
  }

  get pane(): FloatingPane {
    return document.querySelector("#openstore-tasks-pane")!;
  }
  get terminalPane(): FloatingPane {
    return document.querySelector("#openstore-terminal-pane")!;
  }
  get terminalButton(): TerminalButton {
    return (this.pane.querySelector("openstore-tasks-pane") as TasksPane)
      .terminalButton;
  }

  constructor() {
    super();

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.pane.shown) this.togglePaneShown();
    });

    this.addEventListener("togglePaneShown", () => {
      this.togglePaneShown();
    });
    this.addEventListener("showPane", () => {
      this.showPane();
    });
  }

  static styles = [BootstrapBlockElement.styles];

  render() {
    return html`${BootstrapBlockElement.styleLink}

      <button
        class="openstore-jsnav-toggle-link btn btn-outline-info"
        @click=${this.togglePaneShown}
      >
        Tasks
        <span class="text-primary ms-2">${this.liveTaskCount}</span>
        ${this.liveTaskCount > 0
          ? html`
              <div
                class="spinner-border spinner-border-sm text-primary ms-1"
                role="status"
              ></div>
            `
          : ""}
      </button> `;
  }

  private terminalPaneEnabled = false;

  togglePaneShown() {
    if (this.pane.shown) {
      this.terminalPaneEnabled =
        !this.terminalPane.classList.contains("d-none");
      if (this.terminalPaneEnabled) {
        this.terminalButton.toggleShown();
      }
    }

    this.pane.shown = !this.pane.shown;

    const button = this.renderRoot.querySelector("button")!;

    if (this.pane.shown) button.classList.add("active");
    else button.classList.remove("active");

    if (this.pane.shown && this.terminalPaneEnabled) {
      this.terminalButton.toggleShown();
    }
  }

  showPane() {
    if (!this.pane.shown) this.togglePaneShown();
  }
}
