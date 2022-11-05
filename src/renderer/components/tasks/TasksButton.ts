import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import FloatingPane from "components/ui-elements/floating-pane/FloatingPane";
import TerminalButton from "components/terminal/TerminalButton";
import { html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { isLiveTaskState } from "../../tasks/Task";
import taskQueue, { TaskQueueObserver } from "../../tasks/TaskQueue";
import { TasksPane } from "./TasksPane";
import SettingsButton from "components/settings/SettingsButton";

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

  @query("button")
  readonly button: HTMLButtonElement;

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

  get settingsButton(): SettingsButton {
    return document.querySelector("openstore-settings-button")!;
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
    return html`
      <button class="btn btn-light text-nowrap" @click=${this.togglePaneShown}>
        Tasks
        <span class="ms-2">${this.liveTaskCount}</span>
        ${this.liveTaskCount > 0
          ? html`
              <div
                class="spinner-border spinner-border-sm align-text-bottom ms-1"
                role="status"
              ></div>
            `
          : ""}
      </button>
    `;
  }

  private terminalPaneWasShown = false;

  togglePaneShown() {
    if (this.pane.shown) {
      // We're about to hide the Tasks pane

      // Record whether the Terminal pane was shown before the Tasks pane hid
      // This allows us to make it reappear if appropriate when the Tasks pane reappears
      this.terminalPaneWasShown =
        !this.terminalPane.classList.contains("d-none");

      // Hide Terminal pane if it was shown
      if (this.terminalPaneWasShown) this.terminalButton.toggleShown();
    }

    // Toggle Tasks pane
    this.pane.shown = !this.pane.shown;

    // Update Tasks button visual state
    if (this.pane.shown) this.button.classList.add("active");
    else this.button.classList.remove("active");

    if (this.pane.shown) {
      // We've just shown the Tasks pane

      // Hide conflicting Settings pane
      this.settingsButton.hidePane();

      if (this.terminalPaneWasShown) {
        // Make the Terminal pane reappear, since it was open last time
        this.terminalButton.toggleShown();
      }
    }
  }

  showPane() {
    if (!this.pane.shown) this.togglePaneShown();
  }

  hidePane() {
    if (this.pane.shown) this.togglePaneShown();
  }
}
