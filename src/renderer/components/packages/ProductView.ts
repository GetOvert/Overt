import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import { QueuedTask } from "tasks/Task";
import taskQueue, { TaskQueueObserver } from "tasks/TaskQueue";
import {
  css,
  CSSResultArray,
  html,
  HTMLTemplateResult,
  PropertyValues,
} from "lit";
import { repeat } from "lit/directives/repeat.js";
import {
  PackageDetailField,
  PackageDetailFieldValue,
} from "package-manager/PackageInfoAdapter";

export type Button = {
  title: string;
  color: string;

  shown: boolean;

  enabled?: boolean;
  loading?: boolean;

  onClick: () => Promise<void>;
};

export abstract class ProductView extends BootstrapBlockElement {
  protected abstract readonly subtitle: string;
  protected abstract readonly description: string;
  protected abstract readonly websiteURL: string | undefined;
  protected abstract shouldCauseRerender(successfulTask: QueuedTask): boolean;
  protected abstract canLinkToPackageName(packageName: string): boolean;
  protected abstract fields: PackageDetailField[][];
  protected abstract buttons: Button[];

  private taskQueueObserver: TaskQueueObserver;

  connectedCallback(): void {
    super.connectedCallback();

    this.taskQueueObserver = this.taskQueueChanged.bind(this);
    taskQueue.addObserver(this.taskQueueObserver);

    document.addEventListener("keydown", this.keydown);
  }

  protected updated(changedProperties: PropertyValues<this>): void {
    this.addPopperTooltips();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();

    taskQueue.removeObserver(this.taskQueueObserver);

    document.removeEventListener("keydown", this.keydown);

    this.removePopperTooltips();
  }

  private keydown(event: KeyboardEvent) {
    if (event.key === "Escape") window.history.back();
  }

  private taskQueueChanged(updatedTask: QueuedTask) {
    if (this.shouldCauseRerender(updatedTask)) {
      (window as any).openStore.displayPageForWindowLocation(
        document.querySelector("#content")
      );
    }
  }

  static styles: CSSResultArray = [
    BootstrapBlockElement.styles,
    css`
      .fs-slightly-larger {
        font-size: 1rem;
      }

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
        <p class="fs-slightly-larger text-muted text-center mt-1 mb-2">
          <a
            href=${this.websiteURL}
            data-bs-toggle="tooltip"
            data-bs-placement="bottom"
            title="Go to official website"
            @click=${(e: Event) => {
              e.preventDefault();
              window.openExternalLink.open(this.websiteURL!);
            }}
            >${this.websiteURL}</a
          >
        </p>
        <p class="fs-slightly-larger text-center" style="white-space: no-wrap">
          ${this.description}
        </p>

        <div class="text-center w-100 my-4">
          <div class="btn-group mx-auto" role="group">
            ${repeat(
              shownButtons,
              ({ title }) => title,
              ({ title, color, enabled, loading, onClick }) => html`
                <button
                  class="btn btn-${color}"
                  style="min-width: ${buttonWidth}vw; height: 2.7rem"
                  ?disabled=${!enabled}
                  @click=${onClick}
                >
                  ${title}
                  ${loading
                    ? html`<span
                        class="spinner-border spinner-border-sm text-white ms-2"
                        style="vertical-align: text-bottom"
                        role="status"
                      ></span>`
                    : ""}
                </button>
              `
            )}
          </div>
        </div>

        <div class="row g-0 mx-3 pt-2">
          ${this.fields.map(
            (fields) =>
              html`
                <div class="col">
                  ${repeat(
                    fields,
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
              `
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
