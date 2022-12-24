import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import { css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { until } from "lit/directives/until.js";
import "./CardActionButtons";
import { CardAction } from "./CardActionButtons";

@customElement("openstore-card")
export default class Card extends BootstrapBlockElement {
  @property()
  title = "";
  @property()
  subtitle = "";
  @property()
  status = "";
  @property()
  statusColor = "muted";
  @property()
  details = "";
  @property()
  href = "#";

  @property()
  iconURL?: string;

  @property()
  actions?: CardAction[];

  @query(".openstore-card-link")
  private readonly linkElement: HTMLAnchorElement | null;

  static styles = [
    BootstrapBlockElement.styles,
    css`
      .user-drag-none {
        -webkit-user-drag: none;
      }

      .card,
      .card * {
        z-index: 2;
      }
      .card::before {
        content: "";
        position: absolute;
        z-index: 1;
        width: 100%;
        height: 100%;

        background: var(--accent-color-dark);
        opacity: 0;
        transition: opacity 0.2s;
      }
      .card:hover::before,
      .openstore-card-link:focus-visible .card::before {
        opacity: 20%;
      }

      .card-title {
        font-size: 1.1rem;
      }
      .card-subtitle {
        font-size: 0.85rem;
      }

      .package-icon {
        width: 5rem;
        padding: 0.25rem;
      }
    `,
  ];

  render() {
    return html`
      <a
        href=${this.href}
        class="openstore-card-link openstore-jsnav-link user-drag-none"
        @click=${this.clicked}
      >
        <div class="card flex-row bg-light shadow-sm my-3">
          <div
            class="d-flex flex-nowrap align-items-center ms-lg-2 flex-grow-1"
          >
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

          <overt-card-action-buttons
            class="transparent-unless-parent-hovered"
            style="transition: opacity 0.2s"
            .actions=${this.actions}
          ></overt-card-action-buttons>
        </div>
      </a>
    `;
  }

  private async renderIcon() {
    return (await this.isIconValid())
      ? html`
          <div class="package-icon flex-shrink-0">
            <img
              src=${this.iconURL}
              class="img-fluid user-drag-none"
              aria-label="Icon for ${this.title}"
            />
          </div>
        `
      : "";
  }

  static iconValidityCache: Record<string, boolean> = {};

  private async isIconValid(): Promise<boolean> {
    if (!this.iconURL) return false;

    if (this.iconURL in Card.iconValidityCache) {
      return Card.iconValidityCache[this.iconURL];
    }

    const response = await fetch(this.iconURL);
    const valid = response.ok;

    Card.iconValidityCache[this.iconURL] = valid;
    return valid;
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
