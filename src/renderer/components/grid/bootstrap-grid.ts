import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import { css, html } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("openstore-grid")
export class Grid extends BootstrapBlockElement {
  constructor() {
    super();
  }

  render() {
    return html`${BootstrapBlockElement.styleLink}

      <div class="openstore-grid-container container">
        <slot></slot>
      </div> `;
  }
}

@customElement("openstore-row")
export class Row extends BootstrapBlockElement {
  constructor() {
    super();
  }

  render() {
    return html`${BootstrapBlockElement.styleLink}

      <div class="row row-cols-auto justify-content-evenly">
        <slot></slot>
      </div> `;
  }
}

@customElement("openstore-col")
export class Column extends BootstrapBlockElement {
  constructor() {
    super();
  }

  static styles = [
    BootstrapBlockElement.styles,
    css`
      :host {
        flex: 0 0 auto;
      }
    `,
  ];

  render() {
    return html`${BootstrapBlockElement.styleLink}

      <div class="col gx-4 gy-0">
        <slot></slot>
      </div> `;
  }
}
