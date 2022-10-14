import { Modal } from "bootstrap";
import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import LightDOMBlockElement from "components/abstract/LightDOMBlockElement";
import { html, HTMLTemplateResult, nothing, PropertyValues, render } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { createRef, Ref, ref } from "lit/directives/ref.js";

@customElement("openstore-action-confirmation-modal")
export default class ActionConfirmationModal extends LightDOMBlockElement {
  get customElementName(): string {
    return "openstore-action-confirmation-modal";
  }

  @property()
  modalPrompt: string;
  @property()
  modalPromptCannedMessage: HTMLTemplateResult | typeof nothing;
  @property()
  modalLinkURL: string | null;
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
    promptCannedMessage: HTMLTemplateResult | typeof nothing,
    url: string | null,
    title: string,
    confirmButtonTitle: string,
    cancelButtonTitle: string
  ): Promise<boolean> {
    const modalContainer = document.querySelector(
      "#modalContainer"
    ) as HTMLElement;
    render(
      html`
        <openstore-action-confirmation-modal
          .modalPrompt=${prompt}
          .modalPromptCannedMessage=${promptCannedMessage}
          .modalLinkURL=${ifDefined(url)}
          .modalTitle=${title}
          .confirmButtonTitle=${confirmButtonTitle}
          .cancelButtonTitle=${cancelButtonTitle}
        ></openstore-action-confirmation-modal>
      `,
      modalContainer
    );
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
    changedProperties: PropertyValues<this>
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
        <div class="modal-dialog">
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
              ${this.modalPromptCannedMessage}
            </div>
            <div class="modal-footer">
              ${this.modalLinkURL &&
              html`<a
                href=${this.modalLinkURL}
                class="btn btn-outline-info me-auto"
                @click=${this.openModalLinkURL}
                >Go to site

                <!-- https://icons.getbootstrap.com/icons/box-arrow-up-right/ -->
                <svg
                  aria-label="External link"
                  style="transform: scale(0.8) translateY(-2px)"
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
              </a>`}

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

  private openModalLinkURL(event: Event) {
    event.preventDefault();

    if (!this.modalLinkURL) return;
    window.openExternalLink.open(this.modalLinkURL);
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

    const modalContainer = document.querySelector(
      "#modalContainer"
    ) as HTMLElement;
    render("", modalContainer);
  }
}
