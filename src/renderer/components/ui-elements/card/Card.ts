import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import { css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { until } from "lit/directives/until.js";

@customElement("openstore-card")
export default class Card extends BootstrapBlockElement {
  @property()
  title = "";
  @property()
  subtitle = "";
  @property()
  status = "status";
  @property()
  statusColor = "muted";
  @property()
  details = "";
  @property()
  href = "#";

  @property()
  iconURL?: string;

  @query(".openstore-card-link")
  private readonly linkElement: HTMLAnchorElement | null;

  static styles = [
    BootstrapBlockElement.styles,
    css`
      .user-select-none {
        -webkit-user-drag: none;
      }

      .card,
      .card * {
        z-index: 2;
      }
      .card:hover::before,
      .openstore-card-link:focus-visible .card::before {
        content: "";
        position: absolute;
        z-index: 1;
        width: 100%;
        height: 100%;
        background: var(--accent-color-dark);
        opacity: 20%;
      }

      .card-title {
        font-size: 1.25rem;
      }
    `,
  ];

  render() {
    return html`
      <a
        href=${this.href}
        class="openstore-card-link openstore-jsnav-link user-select-none"
        @click=${this.clicked}
      >
        <div class="card bg-light shadow-sm my-3">
          <div class="row flex-nowrap g-0 ms-lg-2 align-items-center">
            ${until(this.renderIcon(), "")}

            <div class="card-body">
              <h2 class="card-title" style="font-weight: 500">${this.title}</h2>
              ${this.subtitle || this.status
                ? html`<h3 class="h5 card-subtitle mb-2 text-muted">
                    ${this.subtitle}
                    ${this.subtitle && this.status ? " • " : ""}
                    ${this.status
                      ? html`<span class="text-${this.statusColor}">
                          ${this.status}
                        </span>`
                      : ""}
                  </h3>`
                : ""}
              <p class="card-text text-dark">${this.details}</p>
            </div>
          </div>
        </div>
      </a>
    `;
  }

  private async renderIcon() {
    return (await this.isIconValid())
      ? html`
          <div class="p-2" style="width: 5rem">
            <img
              src=${this.iconURL}
              class="img-fluid"
              aria-label="Icon for ${this.title}"
            />
          </div>
        `
      : "";
  }

  private async isIconValid(): Promise<boolean> {
    if (!this.iconURL) return false;

    const response = await fetch(this.iconURL);
    return response.ok;
  }

  private clicked(event: Event) {
    event.preventDefault();

    if (this.href) {
      ((window as any).openStore as any).updateWindowLocationFragment(
        this.href
      );
    }
  }

  focus(options?: FocusOptions | undefined): void {
    this.linkElement?.focus(options);
  }
}
