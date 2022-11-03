import { Tooltip } from "bootstrap";
import { css, CSSResultArray, html, HTMLTemplateResult, LitElement } from "lit";
import { bootstrap, reboot } from "styles/bootstrap";
import darkTheme from "styles/dark-theme.lit.css";

export default class BootstrapBlockElement extends LitElement {
  static styles: CSSResultArray = [
    reboot,
    bootstrap,
    (console.log(darkTheme), darkTheme),
    css`
      :host {
        display: block;
      }

      :host {
        --bs-primary: var(--accent-color);
        --bs-primary-rgb: var(--accent-color-rgb);
      }

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

      .btn-primary {
        --bs-btn-bg: var(--bs-primary);
        --bs-btn-border-color: var(--bs-primary);
        --bs-btn-hover-bg: var(--accent-color-dark);
        --bs-btn-hover-border-color: var(--accent-color-dark);
        --bs-btn-active-bg: var(--accent-color-darker);
        --bs-btn-active-border-color: var(--accent-color-darker);
        --bs-btn-disabled-bg: var(--bs-primary);
        --bs-btn-disabled-border-color: var(--bs-primary);
      }
      .btn-outline-primary {
        --bs-btn-color: var(--bs-primary);
        --bs-btn-border-color: var(--bs-primary);
        --bs-btn-hover-bg: var(--bs-primary);
        --bs-btn-hover-border-color: var(--bs-primary);
        --bs-btn-active-bg: var(--bs-primary);
        --bs-btn-active-border-color: var(--bs-primary);
        --bs-btn-disabled-color: var(--bs-primary);
        --bs-btn-disabled-border-color: var(--bs-primary);
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
      a:active,
      .nav-link:active,
      .btn-link:active {
        color: var(--accent-color-darker) !important;
      }

      .nav-tabs .nav-link,
      .nav-tabs .nav-link.disabled,
      .nav-tabs .nav-link.disabled:hover,
      .nav-tabs .nav-link.disabled:focus {
        color: var(--bs-border-color);
        background-color: var(--bs-light);
        border-color: var(--bs-border-color);
      }

      .nav-pills .nav-link.active,
      .nav-pills .nav-link:hover,
      .nav-pills .nav-link:focus {
        background-color: var(--bs-light);
        border-color: var(--bs-border-color);
      }
      .nav-pills .nav-link.disabled,
      .nav-pills .nav-link.disabled:hover {
        color: var(--bs-border-color);
      }

      .nav-pills .nav-link:hover {
        color: var(--bs-dark);
      }
      .nav-pills .nav-link:focus {
        color: var(--bs-dark);
      }
      .nav-pills .nav-link.active {
        color: var(--bs-light);
        background-color: var(--accent-color);
      }
    `,
  ];

  getRootNode(options?: GetRootNodeOptions): ShadowRoot {
    return super.getRootNode(options) as ShadowRoot;
  }

  protected popperTooltips: Tooltip[] = [];

  protected addPopperTooltips() {
    this.popperTooltips = Array.from(
      this.renderRoot.querySelectorAll('[data-bs-toggle="tooltip"]')
    ).map((tooltipHost) => new Tooltip(tooltipHost));
  }

  protected removePopperTooltips() {
    this.popperTooltips.forEach((tooltip) => {
      tooltip.dispose();
    });
    this.popperTooltips = [];
  }
}
