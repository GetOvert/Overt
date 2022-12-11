import { Modal } from "bootstrap";
import LightDOMBlockElement from "components/abstract/LightDOMBlockElement";
import { html, PropertyValues, render } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { createRef, Ref, ref } from "lit/directives/ref.js";

@customElement("openstore-broadcast-modal")
export default class BroadcastModal extends LightDOMBlockElement {
  get customElementName(): string {
    return "openstore-broadcast-modal";
  }

  @property()
  title: string;
  @property()
  body: string;
  @property()
  url?: string;
  @property()
  cta: string = "Read More";

  private resolve?: () => void;

  static async runModal({
    title,
    body,
    url,
    cta,
  }: {
    title: string;
    body: string;
    url?: string;
    cta?: string;
  }): Promise<void> {
    const modalContainer = document.querySelector(
      "#modalContainer"
    ) as HTMLElement;
    render(
      html`
        <openstore-broadcast-modal
          .title=${title}
          .body=${body}
          .url=${url}
          .cta=${ifDefined(cta)}
        ></openstore-broadcast-modal>
      `,
      modalContainer
    );
    return (modalContainer.lastElementChild as BroadcastModal).runModal();
  }

  private async runModal(): Promise<void> {
    return new Promise((resolve) => {
      this.resolve = resolve;
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

  render() {
    return html`
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
                ${this.title}
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
              <p style="white-space: pre-wrap">${this.body}</p>
            </div>
            <div class="modal-footer">
              ${this.url
                ? html`<a
                    href=${this.url}
                    class="btn btn-outline-info me-auto"
                    @click=${this.openURL}
                    >${this.cta}

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
                  </a>`
                : ""}

              <button
                type="button"
                class="btn btn-light"
                data-bs-dismiss="modal"
              >
                Dismiss
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  private openURL(event: Event) {
    event.preventDefault();

    if (!this.url) return;
    window.openExternalLink.open(this.url);
  }

  private onDismiss() {
    this.resolve?.();

    const modalContainer = document.querySelector(
      "#modalContainer"
    ) as HTMLElement;
    render("", modalContainer);
  }
}
