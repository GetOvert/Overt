import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import { QueuedTask } from "components/tasks/model/Task";
import taskQueue, { TaskQueueObserver } from "components/tasks/model/TaskQueue";
import { css, CSSResultArray, html, HTMLTemplateResult } from "lit";
import { repeat } from "lit/directives/repeat.js";
import {
  PackageDetailField,
  PackageDetailFieldValue,
} from "package-manager/PackageInfoAdapter";

export type Button = {
  title: string;
  color: string;
  shown: boolean;
  onClick: () => Promise<void>;
};

export abstract class ProductView extends BootstrapBlockElement {
  protected abstract readonly subtitle: string;
  protected abstract shouldCauseRerender(successfulTask: QueuedTask): boolean;
  protected abstract canLinkToPackageName(packageName: string): boolean;
  protected abstract fields: PackageDetailField[];
  protected abstract buttons: Button[];

  private taskQueueObserver: TaskQueueObserver;

  connectedCallback(): void {
    super.connectedCallback();

    this.taskQueueObserver = this.taskQueueChanged.bind(this);
    taskQueue.addObserver(this.taskQueueObserver);

    document.addEventListener("keydown", this.keydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();

    taskQueue.removeObserver(this.taskQueueObserver);

    document.removeEventListener("keydown", this.keydown);
  }

  private keydown(event: KeyboardEvent) {
    if (event.key === "Escape") window.history.back();
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

  static styles: CSSResultArray = [
    BootstrapBlockElement.styles,
    css`
      dt,
      dd {
        display: inline;
      }
      /* Break line after dd */
      dl dd::after {
        content: "";
        display: block;
      }
    `,
  ];

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
          ({ heading, value, valuesArePackageNames }) => {
            const valueHTML = this.htmlForFieldValue(
              value,
              valuesArePackageNames ?? false,
              true
            );
            return valueHTML
              ? html`
                  <h3 style="font-weight: 500">${heading}</h3>
                  ${valueHTML}
                `
              : "";
          }
        )}
        </div>
      </div>
    `;
  }

  private htmlForFieldValue(
    value: PackageDetailFieldValue | undefined,
    valuesArePackageNames: boolean,
    isRoot: boolean = false
  ): HTMLTemplateResult | null {
    if (!value) return null;

    if (Array.isArray(value)) {
      if (!value.length) return null;

      return html`
        <ul>
          ${repeat(
            value,
            (subvalue) =>
              html`<li>
                ${this.htmlForFieldValue(subvalue, valuesArePackageNames)}
              </li>`
          )}
        </ul>
      `;
    }

    if (typeof value === "object" && !this.isLitTemplateResult(value)) {
      return html`
        <dl>
          ${repeat(
            Object.entries(value),
            ([key, subvalue]) => html`
              <dt>${key}:</dt>
              <dd>${subvalue}</dd>
            `
          )}
        </dl>
      `;
    }

    if (typeof value === "string") {
      if (valuesArePackageNames && this.canLinkToPackageName(value)) {
        const href = ((window as any).openStore as any).encodeFragment({
          subpage: value,
        });

        value = html`<a
          href=${href}
          data-orig-href=${href}
          @click=${this.linkClicked}
          >${value}</a
        >`;
      }

      return isRoot
        ? html` <p style="white-space: pre-wrap">${value}</p> `
        : html`${value}`;
    }

    return value;
  }

  private linkClicked(event: Event) {
    event.preventDefault();

    const a = event.target as HTMLAnchorElement;
    if (a.dataset.origHref) {
      ((window as any).openStore as any).updateWindowLocationFragment(
        a.dataset.origHref
      );
    }
  }

  private isLitTemplateResult(value: object): value is HTMLTemplateResult {
    return (value as any)["_$litType$"] !== undefined;
  }
}
