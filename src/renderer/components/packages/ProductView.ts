import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import { QueuedTask } from "tasks/Task";
import taskQueue, { TaskQueueObserver } from "tasks/TaskQueue";
import {
  css,
  CSSResultArray,
  html,
  HTMLTemplateResult,
  Part,
  PropertyValues,
} from "lit";
import { directive } from "lit/directive.js";
import { repeat } from "lit/directives/repeat.js";
import { UntilDirective } from "lit/directives/until.js";
import {
  PackageDetailField,
  PackageDetailFieldValue,
} from "package-manager/PackageInfoAdapter";

export type Button = {
  title: string | HTMLTemplateResult;
  icon?: string | HTMLTemplateResult;
  color: string;

  shown: boolean;

  enabled?: boolean;
  loading?: boolean;

  onClick: () => Promise<void>;

  moreActions?: Button[];
};

export abstract class ProductView extends BootstrapBlockElement {
  protected abstract readonly subtitle: string;
  protected abstract readonly description: string;
  protected abstract readonly sourceRepositoryName: string;
  protected abstract readonly publisher: string | undefined;
  protected abstract readonly websiteURL: string | undefined;
  protected abstract shouldCauseRerender(successfulTask: QueuedTask): boolean;
  protected abstract canLinkToPackageName(packageName: string): boolean;
  protected abstract readonly fields: PackageDetailField[][];
  protected abstract buttons(): Promise<Button[]>;

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

  protected updated(changedProperties: PropertyValues<this>): void {
    this.addDynamicElements();
  }

  private addDynamicElements(): void {
    this.addPopperTooltips();
    this.addPopperDropdowns();
  }

  private keydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopImmediatePropagation();
      window.history.back();
    }
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

      .loading-text-match-button-height {
        margin-top: 9.5975px;
        margin-bottom: 9.5975px;
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
    return html`
      <div class="mx-4">
        <p
          class="d-flex flex-column gap-1 fs-slightly-larger text-center mt-1 mb-2"
        >
          <a
            href=${this.websiteURL}
            class="p-1"
            data-bs-toggle="tooltip"
            data-bs-placement="bottom"
            data-bs-custom-class="tooltip-wide"
            data-bs-container="body"
            title="Go to official website${this.publisher &&
            ` — ${this.websiteURL}`}"
            @click=${this.openExternalLink}
          >
            ${this.publisher || this.websiteURL}
          </a>
          ${this.description}
        </p>

        <div class="text-center w-100 my-4">
          <div class="btn-group mx-auto" role="group">
            ${untilWithCallback(
              () => this.addDynamicElements(),
              (async () => {
                const shownButtons: Button[] = (await this.buttons()).filter(
                  (button) => button.shown
                );
                const buttonWidth =
                  shownButtons.length > 2 ? 16 : 32 / shownButtons.length;

                return shownButtons.map(
                  (
                    {
                      title,
                      icon,
                      color,
                      enabled,
                      loading,
                      onClick,
                      moreActions,
                    },
                    index
                  ) => {
                    const shownMoreActions: Button[] = (
                      moreActions ?? []
                    ).filter(({ shown }) => shown);

                    const buttonHTML = html`
                      <button
                        type="button"
                        class="btn btn-${color}"
                        style="min-width: ${buttonWidth -
                        (shownMoreActions.length
                          ? buttonWidth / 8
                          : 0)}vw; height: 2.7rem"
                        ?disabled=${!enabled}
                        @click=${onClick}
                      >
                        ${title} <span class="ms-1">${icon}</span>
                        ${loading
                          ? html`<span
                              class="spinner-border spinner-border-sm text-white ms-2"
                              style="vertical-align: text-bottom"
                              role="status"
                            ></span>`
                          : ""}
                      </button>
                    `;

                    if (!shownMoreActions.length) return buttonHTML;
                    return html`
                      <div class="btn-group" role="group">
                        ${buttonHTML}

                        <button
                          id="product-view-dropdown-button-${index}"
                          type="button"
                          class="btn btn-${color} dropdown-toggle border-start"
                          data-bs-toggle="dropdown"
                          aria-haspopup="true"
                          aria-label="Toggle related actions dropdown"
                          ?disabled=${!enabled}
                        ></button>
                        <ul
                          class="dropdown-menu"
                          aria-labelledby="product-view-dropdown-button-${index}"
                        >
                          ${shownMoreActions.map(
                            ({
                              title,
                              color,
                              enabled,
                              loading,
                              onClick,
                            }) => html`
                              <li>
                                <button
                                  class="dropdown-item text-${color}"
                                  href="#"
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
                              </li>
                            `
                          )}
                        </ul>
                      </div>
                    `;
                  }
                );
              })(),
              html`
                <div
                  class="loading-text-match-button-height fs-slightly-larger text-muted"
                  role="status"
                >
                  Loading actions…
                  <span
                    class="spinner-border spinner-border-sm ms-1"
                    aria-hidden="true"
                  ></span>
                </div>
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
          ${this.websiteURL?.includes("getovert.app")
            ? ""
            : html`
                <hr class="mt-5 mb-4" />
                <h3 class="h5">FYI</h3>
                <div class="d-flex gap-2 h6 ms-2 mt-2 mb-4">
                  <p>
                    Overt is not affiliated with or endorsed by the publisher of
                    this software. This package is provided by the
                    ${this.sourceRepositoryName} catalog source.
                  </p>
                  <p>
                    If you own this software and do not want its logo shown
                    here, please open an issue at
                    <span class="text-nowrap"
                      >${this.renderExternalLink(
                        "https://github.com/GetOvert/package-meta/issues",
                        "GetOvert/package-meta on GitHub"
                      )}</span
                    >.
                  </p>
                  <p>
                    If you own this software and do not want it listed here at
                    all, please contact the maintainer(s) of the
                    ${this.sourceRepositoryName} catalog source.
                  </p>
                </div>
              `}
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
      if (!Object.keys(value).length) return null;

      return html`
        <dl>
          ${repeat(
            Object.entries(value),
            ([key, subvalue]) => html`
              <dt>${key}:</dt>
              <dd>
                ${this.htmlForFieldValue(subvalue, valuesArePackageNames)}
              </dd>
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

  private renderExternalLink(url: string, label: string) {
    return html`
      <a href=${url} @click=${this.openExternalLink}>
        ${label}

        <!-- https://icons.getbootstrap.com/icons/box-arrow-up-right/ -->
        <svg
          aria-label="External link"
          style="transform: scale(0.8) translateY(-3px)"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          class="bi bi-box-arrow-up-right"
          viewBox="0 0 16 16"
        >
          <path
            fill-rule="evenodd"
            d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"
          />
          <path
            fill-rule="evenodd"
            d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"
          />
        </svg>
      </a>
    `;
  }

  private openExternalLink(event: Event) {
    event.preventDefault();
    window.openExternalLink.open(
      (event.target as HTMLElement).closest("a")!.href
    );
  }
}

class UntilWithCallbackDirective extends UntilDirective {
  changed?: () => void;

  update(part: Part, [overt_changed, ...args]: any[]) {
    this.changed = overt_changed;
    return super.update(part, args);
  }

  setValue(value: unknown): void {
    super.setValue(value);
    this.changed?.();
  }
}

const untilWithCallback = directive(UntilWithCallbackDirective);
