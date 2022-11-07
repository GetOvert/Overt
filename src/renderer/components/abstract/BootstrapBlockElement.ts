import { Dropdown, Tooltip } from "bootstrap";
import { css, CSSResultArray, LitElement } from "lit";

import "bootstrap/dist/js/bootstrap.bundle.js";
import bootstrapReboot from "styles/vendor/bootstrap-reboot.lit.css";
import bootstrap from "styles/vendor/bootstrap.lit.css";

import bootstrapOverrides from "styles/bootstrap-overrides.lit.css";
import darkTheme from "styles/dark-theme.lit.css";

export default class BootstrapBlockElement extends LitElement {
  static styles: CSSResultArray = [
    bootstrapReboot,
    bootstrap,
    bootstrapOverrides,
    darkTheme,
    css`
      :host {
        display: block;
      }
    `,
  ];

  getRootNode(options?: GetRootNodeOptions): ShadowRoot {
    return super.getRootNode(options) as ShadowRoot;
  }

  disconnectedCallback(): void {
    this.removePopperTooltips();
    this.removePopperDropdowns();
  }

  protected popperTooltips: Tooltip[] = [];

  protected addPopperTooltips() {
    this.removePopperTooltips();

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

  protected popperDropdowns: Dropdown[] = [];
  private hideDropdownsListenerFn = this.hideDropdowns.bind(this);

  protected addPopperDropdowns() {
    this.removePopperDropdowns();

    this.popperDropdowns = Array.from(
      this.renderRoot.querySelectorAll('[data-bs-toggle="dropdown"]')
    ).map((dropdownHost) => {
      const existing = Dropdown.getInstance(dropdownHost);
      if (existing) return existing;

      const dropdown = Dropdown.getOrCreateInstance(dropdownHost);

      dropdownHost.addEventListener("click", (event) => {
        event.stopPropagation();
        dropdown.toggle();
      });

      return dropdown;
    });

    document.addEventListener("click", this.hideDropdownsListenerFn);
  }

  protected removePopperDropdowns() {
    document.removeEventListener("click", this.hideDropdownsListenerFn);

    this.popperDropdowns.forEach((dropdown) => {
      dropdown.dispose();
    });
    this.popperDropdowns = [];
  }

  private hideDropdowns() {
    this.popperDropdowns.forEach((dropdown) => {
      dropdown.hide();
    });
  }
}
