import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import { css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";

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
        class="openstore-card-link openstore-jsnav-link col-lg-8 user-select-none"
        @click=${this.clicked}
      >
        <div class="card bg-light shadow-sm my-3">
          <div class="row g-0 ms-lg-2 align-items-center">
            <!-- <a
            href=${this.href}
            class="col-lg-4 openstore-card-link openstore-jsnav-link"
            @click=${this.clicked}
          >
            <img
              src="https://99designs-blog.imgix.net/blog/wp-content/uploads/2017/04/attachment_82290822-e1492536097660.png?auto=format&q=60&fit=max&w=930"
              class="img-fluid"
              alt=""
            />
          </a> -->

            <div class="card-body col-lg-8">
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
