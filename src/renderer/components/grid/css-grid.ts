import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import { css, html } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("openstore-css-grid")
export class Row extends BootstrapBlockElement {
  constructor() {
    super();
  }

  static styles = [
    BootstrapBlockElement.styles,
    css`
      .openstore-row-container {
        display: grid;
        grid-template-columns: repeat(1, 1fr);
      }

      @media (min-width: 920px) {
        .openstore-row-container {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (min-width: 1300px) {
        .openstore-row-container {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      @media (min-width: 1680px) {
        .openstore-row-container {
          grid-template-columns: repeat(4, 1fr);
        }
      }
    `,
  ];

  render() {
    return html`
      <div class="openstore-row-container">
        <slot></slot>
      </div>
    `;
  }
}
