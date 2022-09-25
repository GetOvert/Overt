import { Modal } from "bootstrap";
import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import LightDOMBlockElement from "components/abstract/LightDOMBlockElement";
import { css, html, render } from "lit";
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

  itemChanges?: SourceRepositoryChange[] = [];

  @state()
  private editingItem: SourceRepository = {
    packageManager: null,
    name: null,
    url: null,
  };
  @state()
  private editingItemIndex?: number = null;
  private editingItemIsNew: boolean = false;

  private resolve: (items: SourceRepositoryChange[]) => void;
  private reject: (error: any) => void;

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

  protected firstUpdated(
    changedProperties: Map<string | number | symbol, unknown>
  ): void {
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
        background: #fff !important;
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
    return html`${BootstrapBlockElement.styleLink}
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
                      this.editingItemIndex === index
                        ? html`
                      <tr>
                        <td>
                          <select class="form-select form-select-sm" @change=${this.setEditingItemProperty.bind(
                            this,
                            "packageManager"
                          )}>
                            ${sourceRepositoryPackageMangers.map(
                              (packageManager) => html`
                                <option
                                  ?selected=${this.editingItem
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
                            value=${this.editingItem.name}
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
                            value=${this.editingItem.url}
                            @change=${this.setEditingItemProperty.bind(
                              this,
                              "url"
                            )}
                          />  
                      </td>
                        <th class="d-flex">
                          <button
                            type="button"
                            class="btn btn-danger fs-4 mx-1"
                            style="width: 2.5rem"
                            @click=${this.cancelItemEditing.bind(this, index)}
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
                          </td>
                      </tr>
                    `
                        : this.editingItemIndex === null
                        ? html` <tr class="list-item-not-being-edited">
                            <td>${item.packageManager}</td>
                            <td>${item.name}</td>
                            <td
                              colspan=${this.editingItemIndex === null ? 1 : 2}
                            >
                              ${item.url}
                            </td>
                            ${this.editingItemIndex === null
                              ? html`
                                  <th class="d-flex">
                                    <button
                                      type="button"
                                      class="btn btn-danger fs-4 mx-1 list-item-contextual"
                                      style="width: 2.5rem"
                                      @click=${() => this.removeItem(index)}
                                      aria-label="Remove"
                                    >
                                      −
                                    </button>
                                    <button
                                      type="button"
                                      class="btn btn-primary fs-4 mx-1 list-item-contextual"
                                      style="width: 2.5rem"
                                      @click=${() => this.editItem(index)}
                                      aria-label="Edit"
                                    >
                                      ✎
                                    </button>
                                  </th>
                                `
                              : ""}
                          </tr>`
                        : ""
                    )}
                  </tbody>
                </table>
              </div>
              ${this.editingItemIndex === null
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
                        class="btn btn-secondary"
                        data-bs-dismiss="modal"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        class="btn btn-primary"
                        @click=${this.confirm}
                        ?disabled=${this.editingItemIndex !== null}
                      >
                        OK
                      </button>
                    </div>
                  `
                : ""}
            </div>
          </form>
        </div>
      </div> `;
  }

  private addItem() {
    this.items = [
      ...this.items,
      {
        packageManager: sourceRepositoryPackageMangers[0],
        name: null,
        url: null,
      },
    ];

    this.editItem(this.items.length - 1, true);
  }

  private editItem(index: number, isNew: boolean = false) {
    this.editingItem = cloneDeep(this.items[index]);
    this.editingItemIndex = index;
    this.editingItemIsNew = isNew;
  }

  private saveChangesToEditingItem() {
    if (!this.editingItemIsNew) {
      this.itemChanges.push({
        sourceRepository: cloneDeep(this.items[this.editingItemIndex]),
        action: "remove",
      });
    }
    this.itemChanges.push({
      sourceRepository: cloneDeep(this.editingItem),
      action: "add",
    });

    this.items[this.editingItemIndex] = this.editingItem;
    this.editingItemIndex = null;
  }

  private cancelItemEditing() {
    if (this.editingItemIsNew) {
      this.items.splice(this.editingItemIndex, 1);
    }
    this.editingItemIndex = null;
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
    propertyName: keyof typeof this.editingItem,
    event: Event
  ) {
    this.editingItem[propertyName] = (event.target as any).value;
  }

  private confirm(event: Event) {
    event.preventDefault();

    this.resolve?.(this.itemChanges);

    // Prevent repeated call in onDismiss()
    this.resolve = this.reject = null;

    Modal.getInstance(this.modalRoot.value!).hide();
  }

  private onDismiss() {
    this.resolve?.([]);

    const modalContainer = document.querySelector(
      "#modalContainer"
    ) as HTMLElement;
    render("", modalContainer);
  }
}
