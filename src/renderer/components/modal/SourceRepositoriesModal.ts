import { Modal } from "bootstrap";
import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import LightDOMBlockElement from "components/abstract/LightDOMBlockElement";
import { css, html, render } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createRef, Ref, ref } from "lit/directives/ref.js";
import SourceRepository, {
  packageMangers,
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

  @state()
  private editingItem: SourceRepository = {
    packageManager: null,
    name: null,
    url: null,
  };
  @state()
  private editingItemIndex?: number = null;
  private editingItemIsNew: boolean = false;

  private resolve: (items: SourceRepository[]) => void;
  private reject: (error: any) => void;

  static async runModal(
    items: SourceRepository[],
    prompt: string,
    title: string
  ): Promise<SourceRepository[]> {
    const modalContainer = document.querySelector(
      "#modalContainer"
    ) as HTMLElement;
    render(
      html`
        <openstore-source-repositories-modal
          .items=${items}
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

  private async _runModal(): Promise<SourceRepository[]> {
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
        <div class="modal-dialog modal-lg">
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
              <p style="white-space: pre-wrap">${this.modalPrompt}</p>

              <table class="table">
                <thead>
                  <tr>
                    <th>Package Manager</th>
                    <th>Name</th>
                    <th>URL</th>
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
                            <option
                              class="d-none"
                              ?selected=${!this.editingItem.packageManager}
                            >
                              Select
                            </option>
                            ${packageMangers.map(
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
                          <td colspan=${this.editingItemIndex === null ? 1 : 2}>
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

              ${this.editingItemIndex === null
                ? html`
                    <button
                      type="button"
                      class="btn btn-success fs-4"
                      style="width: 2.5rem"
                      @click=${this.addItem}
                    >
                      +
                    </button>
                  `
                : ""}
            </div>
            <div class="modal-footer">
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
              >
                OK
              </button>
            </div>
          </form>
        </div>
      </div> `;
  }

  private addItem() {
    this.items = [
      ...this.items,
      { packageManager: null, name: null, url: null },
    ];

    this.editItem(this.items.length - 1, true);
  }

  private editItem(index: number, isNew: boolean = false) {
    this.editingItem = cloneDeep(this.items[index]);
    this.editingItemIndex = index;
    this.editingItemIsNew = isNew;
  }

  private saveChangesToEditingItem() {
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

    // this.resolve?.(this.items);

    // Prevent reject being called in onDismiss()
    this.resolve = this.reject = null;

    Modal.getInstance(this.modalRoot.value!).hide();
  }

  private onDismiss() {
    this.reject?.(undefined);

    const modalContainer = document.querySelector(
      "#modalContainer"
    ) as HTMLElement;
    render("", modalContainer);
  }
}
