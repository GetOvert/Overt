import { Modal } from "bootstrap";
import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import LightDOMBlockElement from "components/abstract/LightDOMBlockElement";
import { css, html, PropertyValues, render } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createRef, Ref, ref } from "lit/directives/ref.js";
import {
  SourceRepository,
  SourceRepositoryChange,
  sourceRepositoryPackageMangers,
} from "package-manager/SourceRepository";
import cloneDeep from "clone-deep";

@customElement("openstore-source-repositories-modal")
export default class SourceRepositoriesModal extends LightDOMBlockElement {
  get customElementName(): string {
    return "openstore-source-repositories-modal";
  }

  @property()
  items: SourceRepository[];
  @property()
  modalPrompt: string;
  @property()
  modalTitle: string;

  itemChanges: SourceRepositoryChange[] = [];

  @state()
  private editing?: {
    item: SourceRepository;
    index: number;
    isNew: boolean;
  };

  private resolve?: (items: SourceRepositoryChange[]) => void;
  private reject?: (error: any) => void;

  static async runModal(
    items: SourceRepository[],
    prompt: string,
    title: string
  ): Promise<SourceRepositoryChange[]> {
    const modalContainer = document.querySelector(
      "#modalContainer"
    ) as HTMLElement;
    render(
      html`
        <openstore-source-repositories-modal
          .items=${cloneDeep(items)}
          modalPrompt=${prompt}
          modalTitle=${title}
        ></openstore-source-repositories-modal>
      `,
      modalContainer
    );
    return (
      modalContainer.lastElementChild as SourceRepositoriesModal
    )._runModal();
  }

  private async _runModal(): Promise<SourceRepositoryChange[]> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  private modalRoot: Ref<HTMLElement> = createRef();

  protected firstUpdated(changedProperties: PropertyValues<this>): void {
    const modal = Modal.getOrCreateInstance(this.modalRoot.value!);

    this.modalRoot.value!.addEventListener(
      "hidden.bs.modal",
      this.onDismiss.bind(this)
    );

    modal.show();
  }

  static styles = [
    css`
      .modal-body-scroll-container {
        height: 60vh;
        overflow: auto;
      }

      .table {
        margin-bottom: 0;
      }
      .table thead th {
        position: sticky;
        top: 0;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        background: var(--bs-white) !important;
      }
      .table thead th > .th-inner {
        padding-bottom: 0.5rem;
        border-bottom: 2px solid currentColor;
      }
      /* Reset Bootstrap border styles */
      .table > :not(:first-child) {
        border-top: none;
      }

      .list-item-contextual {
        visibility: hidden;
      }
      .list-item-not-being-edited:hover .list-item-contextual {
        visibility: visible;
      }
    `,
  ];

  render() {
    return html`
      <div
        ${ref(this.modalRoot)}
        class="modal"
        id="sourceRepositoriesModal"
        tabindex="-1"
        aria-labelledby="sourceRepositoriesModalLabel"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-xl">
          <form class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title h6" id="sourceRepositoriesModalLabel">
                ${this.modalTitle}
              </h5>
              <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal"
                @click=${this.onDismiss}
                aria-label="Cancel"
              ></button>
            </div>
            <div class="modal-body">
              <div class="modal-body-scroll-container">
                <p style="white-space: pre-wrap">${this.modalPrompt}</p>

                <table class="table">
                  <thead>
                    <tr>
                      <th><div class="th-inner">Package Manager</div></th>
                      <th><div class="th-inner">Name</div></th>
                      <th><div class="th-inner">URL</div></th>
                      <th>
                        <div class="th-inner visually-hidden">Actions</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.items.map((item, index) =>
                      this.editing?.index === index
                        ? html`
                            <tr>
                              <td>
                                <select
                                  class="form-select form-select-sm"
                                  @change=${this.setEditingItemProperty.bind(
                                    this,
                                    "packageManager"
                                  )}
                                >
                                  ${sourceRepositoryPackageMangers.map(
                                    (packageManager) => html`
                                      <option
                                        ?selected=${this.editing?.item
                                          .packageManager === packageManager}
                                      >
                                        ${packageManager}
                                      </option>
                                    `
                                  )}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  class="form-control form-control-sm"
                                  style="width: 10.95rem"
                                  value=${this.editing?.item.name}
                                  @change=${this.setEditingItemProperty.bind(
                                    this,
                                    "name"
                                  )}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  class="form-control form-control-sm"
                                  style="width: 21.4rem"
                                  value=${this.editing?.item.url}
                                  @change=${this.setEditingItemProperty.bind(
                                    this,
                                    "url"
                                  )}
                                />
                              </td>
                              <th>
                                <div class="d-flex">
                                  <button
                                    type="button"
                                    class="btn btn-danger fs-4 mx-1"
                                    style="width: 2.5rem"
                                    @click=${this.cancelItemEditing.bind(
                                      this,
                                      index
                                    )}
                                    aria-label="Done"
                                  >
                                    ✗
                                  </button>
                                  <button
                                    type="button"
                                    class="btn btn-success fs-4 mx-1"
                                    style="width: 2.5rem"
                                    @click=${this.saveChangesToEditingItem.bind(
                                      this,
                                      index
                                    )}
                                    aria-label="Done"
                                  >
                                    ✓
                                  </button>
                                </div>
                              </th>
                            </tr>
                          `
                        : this.editing === undefined
                        ? html` <tr class="list-item-not-being-edited">
                            <td>${item.packageManager}</td>
                            <td>${item.name}</td>
                            <td colspan=${this.editing === undefined ? 1 : 2}>
                              ${item.url}
                            </td>
                            ${this.editing === undefined
                              ? html`
                                  <th>
                                    <div class="d-flex">
                                      <openstore-icon-button
                                        class="mx-1 list-item-contextual"
                                        btn-class="btn-primary"
                                        style="width: 2.5rem"
                                        @click=${() => this.editItem(index)}
                                        aria-label="Edit"
                                      >
                                        <!-- https://icons.getbootstrap.com/icons/pencil-square/ -->
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="16"
                                          height="16"
                                          fill="currentColor"
                                          class="bi bi-pencil-square"
                                          viewBox="0 0 16 16"
                                        >
                                          <path
                                            d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"
                                          />
                                          <path
                                            fill-rule="evenodd"
                                            d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"
                                          />
                                        </svg>
                                      </openstore-icon-button>
                                      <openstore-icon-button
                                        class="mx-1 list-item-contextual"
                                        btn-class="btn-danger"
                                        style="width: 2.5rem"
                                        @click=${() => this.removeItem(index)}
                                        aria-label="Remove"
                                      >
                                        <!-- https://icons.getbootstrap.com/icons/trash3/ -->
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="16"
                                          height="16"
                                          fill="currentColor"
                                          class="bi bi-trash3"
                                          viewBox="0 0 16 16"
                                        >
                                          <path
                                            d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11Zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916Zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47ZM8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"
                                          />
                                        </svg>
                                      </openstore-icon-button>
                                    </div>
                                  </th>
                                `
                              : ""}
                          </tr>`
                        : ""
                    )}
                  </tbody>
                </table>
              </div>
              ${this.editing === undefined
                ? html`
                    <div class="modal-footer">
                      <button
                        type="button"
                        class="btn btn-success fs-4 d-block me-auto"
                        style="width: 2.5rem"
                        @click=${this.addItem}
                      >
                        +
                      </button>

                      <button
                        type="button"
                        class="btn btn-light"
                        data-bs-dismiss="modal"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        class="btn btn-primary"
                        @click=${this.confirm}
                        ?disabled=${this.editing !== undefined}
                      >
                        OK
                      </button>
                    </div>
                  `
                : ""}
            </div>
          </form>
        </div>
      </div>
    `;
  }

  private addItem() {
    this.items = [
      ...this.items,
      {
        packageManager: sourceRepositoryPackageMangers[0],
        name: "",
        url: "",
      },
    ];

    this.editItem(this.items.length - 1, true);
  }

  private editItem(index: number, isNew: boolean = false) {
    this.editing = {
      item: cloneDeep(this.items[index]),
      index,
      isNew,
    };
  }

  private saveChangesToEditingItem() {
    if (!this.editing) return;

    if (!this.editing.isNew) {
      this.itemChanges.push({
        sourceRepository: cloneDeep(this.items[this.editing.index]),
        action: "remove",
      });
    }
    this.itemChanges.push({
      sourceRepository: cloneDeep(this.editing.item),
      action: "add",
    });

    this.items[this.editing.index] = this.editing.item;
    this.editing = undefined;
  }

  private cancelItemEditing() {
    if (!this.editing) return;

    if (this.editing.isNew) {
      this.items.splice(this.editing.index, 1);
    }
    this.editing = undefined;
  }

  private removeItem(index: number) {
    this.itemChanges.push({
      sourceRepository: cloneDeep(this.items[index]),
      action: "remove",
    });

    this.items = [
      ...this.items.slice(0, index),
      ...this.items.slice(index + 1),
    ];
  }

  private setEditingItemProperty(
    propertyName: keyof SourceRepository,
    event: Event
  ) {
    this.editing!.item[propertyName] = (event.target as any).value;
  }

  private confirm(event: Event) {
    event.preventDefault();

    this.resolve?.(this.itemChanges);

    // Prevent repeated call in onDismiss()
    this.resolve = this.reject = undefined;

    Modal.getInstance(this.modalRoot.value!)?.hide();
  }

  private onDismiss() {
    this.resolve?.([]);

    const modalContainer = document.querySelector(
      "#modalContainer"
    ) as HTMLElement;
    render("", modalContainer);
  }
}
