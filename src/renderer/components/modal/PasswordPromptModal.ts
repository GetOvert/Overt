import { Modal } from "bootstrap";
import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import LightDOMBlockElement from "components/abstract/LightDOMBlockElement";
import { html, PropertyValues, render } from "lit";
import { customElement, property } from "lit/decorators.js";
import { createRef, Ref, ref } from "lit/directives/ref.js";

@customElement("openstore-password-prompt-modal")
export default class PasswordPromptModal extends LightDOMBlockElement {
  get customElementName(): string {
    return "openstore-password-prompt-modal";
  }

  @property()
  modalPrompt: string;
  @property()
  modalTitle = "Authentication required";

  private resolve?: (password: string) => void;
  private reject?: (error: any) => void;

  static async runModal(
    prompt: string,
    title: string = "Authentication required"
  ): Promise<string> {
    const modalContainer = document.querySelector("#modalContainer")!;
    modalContainer.innerHTML = `
      <openstore-password-prompt-modal
        modalPrompt="${prompt.replaceAll('"', "&quot;")}"
        modalTitle="${title.replaceAll('"', "&quot;")}"
      ></openstore-password-prompt-modal>
    `;
    return (modalContainer.lastElementChild as PasswordPromptModal)._runModal();
  }

  private async _runModal(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  private modalRoot: Ref<HTMLElement> = createRef();
  private passwordField: Ref<HTMLInputElement> = createRef();

  protected firstUpdated(changedProperties: PropertyValues<this>): void {
    const modal = Modal.getOrCreateInstance(this.modalRoot.value!);

    this.modalRoot.value!.addEventListener(
      "hidden.bs.modal",
      this.onDismiss.bind(this)
    );

    modal.show();
    this.passwordField.value!.focus();
  }

  render() {
    return html`
      <div
        ${ref(this.modalRoot)}
        class="modal"
        id="passwordPromptModal"
        tabindex="-1"
        aria-labelledby="passwordPromptModalLabel"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-sm">
          <form class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title h6" id="passwordPromptModalLabel">
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
              <input
                ${ref(this.passwordField)}
                id="password"
                type="password"
                class="form-control form-control-sm"
                placeholder="••••••••"
                aria-label="Password"
              />
            </div>
            <div class="modal-footer">
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
              >
                OK
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  private confirm(event: Event) {
    event.preventDefault();

    this.resolve?.(this.passwordField.value!.value);

    // Prevent reject being called in onDismiss()
    this.resolve = this.reject = undefined;

    Modal.getInstance(this.modalRoot.value!)?.hide();
  }

  private onDismiss() {
    this.reject?.(undefined);
    this.remove();
  }
}
