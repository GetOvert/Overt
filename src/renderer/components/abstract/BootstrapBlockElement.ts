import { css, CSSResultArray, html, HTMLTemplateResult, LitElement } from "lit";
import { bootstrap, reboot } from "styles/bootstrap";

export default class BootstrapBlockElement extends LitElement {
  constructor() {
    super();
    this.classList.add("d-block");
  }

  static styles: CSSResultArray = [
    reboot,
    bootstrap,
    css`
      :host {
        --bs-body-font-size: 0.9rem;
      }
      .h1,
      h1 {
        font-size: 1.85rem;
      }
      .fs-1 {
        font-size: 1.85rem !important;
      }
      .h2,
      h2 {
        font-size: calc(1.3rem + 0.6vw);
      }
      .fs-2 {
        font-size: calc(1.3rem + 0.6vw) !important;
      }
      .fs-3,
      .h3,
      h3 {
        font-size: calc(1rem + 0.6vw);
      }
      .fs-3 {
        font-size: calc(1rem + 0.6vw) !important;
      }
      .h4,
      h4 {
        font-size: calc(0.92rem + 0.3vw);
      }
      .fs-4 {
        font-size: calc(0.92rem + 0.3vw) !important;
      }
      .h5,
      h5 {
        font-size: calc(0.8rem + 0.15vw);
      }
      .fs-5 {
        font-size: calc(0.8rem + 0.15vw) !important;
      }
      .h6,
      h6 {
        font-size: 0.7rem;
      }
      .fs-6 {
        font-size: 0.7rem;
      }

      a,
      .nav-link,
      .btn-link {
        color: var(--accent-color);
        text-decoration: none;
      }
      a:hover,
      .nav-link:hover,
      .btn-link:hover {
        color: var(--accent-color-dark);
      }
    `,
  ];

  static styleLink: HTMLTemplateResult = html`
    <!-- <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootswatch@5.1.3/dist/sandstone/bootstrap.min.css"
      integrity="sha256-zWAnZkKmT2MYxdCMp506rQtnA9oE2w0/K/WVU7V08zw="
      crossorigin="anonymous"
    /> -->
  `;

  getRootNode(options?: GetRootNodeOptions): ShadowRoot {
    return super.getRootNode(options) as ShadowRoot;
  }
}
