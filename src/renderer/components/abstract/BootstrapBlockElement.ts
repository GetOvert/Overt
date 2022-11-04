import { Tooltip } from "bootstrap";
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
