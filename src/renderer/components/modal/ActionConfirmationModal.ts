import { Modal } from "bootstrap";
import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import LightDOMBlockElement from "components/abstract/LightDOMBlockElement";
import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { createRef, Ref, ref } from "lit/directives/ref.js";

@customElement("openstore-action-confirmation-modal")
export default class ActionConfirmationModal extends LightDOMBlockElement {
  get customElementName(): string {
    return "openstore-action-confirmation-modal";
  }

  @property()
  modalPrompt: string;
  @property()
  modalTitle: string;

  @property()
  confirmButtonTitle: string;
  @property()
  cancelButtonTitle: string;

  private resolve?: (shouldContinue: boolean) => void;
  private reject?: (error: any) => void;

  static async runModal(
    prompt: string,
    title: string,
    confirmButtonTitle: string,
    cancelButtonTitle: string
  ): Promise<boolean> {
    const modalContainer = document.querySelector("#modalContainer")!;
    modalContainer.innerHTML = `
      <openstore-action-confirmation-modal
        modalPrompt="${prompt.replaceAll('"', "&quot;")}"
        modalTitle="${title.replaceAll('"', "&quot;")}"
        confirmButtonTitle="${confirmButtonTitle.replaceAll('"', "&quot;")}"
        cancelButtonTitle="${cancelButtonTitle.replaceAll('"', "&quot;")}"
      ></openstore-action-confirmation-modal>
    `;
    return (
      modalContainer.lastElementChild as ActionConfirmationModal
    )._runModal();
  }

  private async _runModal(): Promise<boolean> {
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

  render() {
    return html`${BootstrapBlockElement.styleLink}
      <div
        ${ref(this.modalRoot)}
        class="modal"
        id="actionConfirmationModal"
        tabindex="-1"
        aria-labelledby="actionConfirmationModalLabel"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-sm">
          <form class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title h6" id="actionConfirmationModalLabel">
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
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                ${this.cancelButtonTitle}
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                @click=${this.confirm}
              >
                ${this.confirmButtonTitle}
              </button>
            </div>
          </form>
        </div>
      </div> `;
  }

  private confirm(event: Event) {
    event.preventDefault();

    this.resolve?.(true);

    // Prevent repeated call in onDismiss()
    this.resolve = this.reject = undefined;

    Modal.getInstance(this.modalRoot.value!)?.hide();
  }

  private onDismiss() {
    this.resolve?.(false);

    this.remove();
  }
}
