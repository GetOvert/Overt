import { css, CSSResultArray } from "lit";

import "bootstrap/dist/js/bootstrap.bundle.js";
import bootstrapReboot from "styles/vendor/bootstrap-reboot.lit.css";
import bootstrap from "styles/vendor/bootstrap.lit.css";

import BaseElement from "./BaseElement";
import bootstrapOverrides from "styles/bootstrap-overrides.lit.css";
import darkTheme from "styles/dark-theme.lit.css";
import utils from "styles/utils.lit.css";
import vars from "styles/vars.lit.css";

export default class BootstrapBlockElement extends BaseElement {
  static styles: CSSResultArray = [
    bootstrapReboot,
    bootstrap,
    bootstrapOverrides,
    darkTheme,
    utils,
    vars,
    css`
      :host {
        display: block;
      }
    `,
  ];

  getRootNode(options?: GetRootNodeOptions): ShadowRoot {
    return super.getRootNode(options) as ShadowRoot;
  }
}
