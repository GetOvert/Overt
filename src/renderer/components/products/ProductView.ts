import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import { QueuedTask } from "components/tasks/model/Task";
import taskQueue, { TaskQueueObserver } from "components/tasks/model/TaskQueue";
import { html, HTMLTemplateResult } from "lit";
import { repeat } from "lit/directives/repeat.js";

export type Field = {
  heading: string;
  value?: FieldValue;
};
export type FieldValue = string | HTMLTemplateResult | FieldValue[];

export type Button = {
  title: string;
  color: string;
  shown: boolean;
  onClick: () => Promise<void>;
};

export abstract class ProductView extends BootstrapBlockElement {
  protected abstract readonly subtitle: string;
  protected abstract shouldCauseRerender(successfulTask: QueuedTask): boolean;
  protected abstract fields: Field[];
  protected abstract buttons: Button[];

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

  private taskQueueChanged(updatedTask: QueuedTask) {
    if (
      updatedTask.state === "succeeded" &&
      this.shouldCauseRerender(updatedTask)
    ) {
      (window as any).openStore.displayPageForWindowLocation(
        document.querySelector("#content")
      );
    }
  }

  render() {
    const shownButtons = this.buttons.filter((button) => button.shown);
    const buttonWidth = shownButtons.length > 2 ? 16 : 32 / shownButtons.length;

    return html`
      <div class="mx-4">
        <h2 class="h3 text-muted text-center mt-1 mb-4">${this.subtitle}</h2>

        <div class="text-center mb-4">
          ${repeat(
            this.buttons,
            ({ title }) => title,
            ({ title, color, shown, onClick }) => html`
              <button
                class="btn btn-${color} ${shown ? "" : "d-none"}"
                style="min-width: ${buttonWidth}vw; height: 2.7rem"
                @click=${onClick}
              >
                ${title}
              </button>
            `
          )}
        </div>

        ${repeat(
          this.fields,
          ({ heading }) => heading,
          ({ heading, value }) =>
            value
              ? html`<h3>${heading}</h3>
                  ${htmlForFieldValue(value, true)}`
              : ""
        )}
        </div>
      </div>
    `;
  }
}

function htmlForFieldValue(
  value?: FieldValue,
  isRoot: boolean = false
): HTMLTemplateResult {
  if (!value) return html``;

  if (Array.isArray(value)) {
    return html`
      <ul>
        ${repeat(
          value,
          (subvalue) => html`<li>${htmlForFieldValue(subvalue)}</li>`
        )}
      </ul>
    `;
  }

  if (typeof value === "string") {
    return isRoot
      ? html` <p style="white-space: pre-wrap">${value}</p> `
      : html`${value}`;
  }

  return value;
}
