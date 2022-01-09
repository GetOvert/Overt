import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import { css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("openstore-floating-pane")
export default class FloatingPane extends BootstrapBlockElement {
  @property({ type: Object })
  anchorPoint: FloatingPaneAnchorPoint = { top: "56px", left: "0" };
  @property()
  width = "20vw";
  @property()
  height = "20vh";

  @property({ type: Boolean })
  shown = false;

  updated(changedProperties: Map<string | number | symbol, unknown>): void {
    if (changedProperties.has("shown")) {
      if (this.shown) this.classList.remove("d-none");
      else this.classList.add("d-none");
    }
  }

  static styles = [
    BootstrapBlockElement.styles,
    css`
      :host {
        position: fixed;
        z-index: 1049;
      }
      .floating-pane-container {
        height: 100%;
        border-radius: 14px / 14px;
      }
      ::slotted(*) {
        height: 100%;
      }
    `,
  ];

  render() {
    return html`${BootstrapBlockElement.styleLink}

      <style>
        :host {
          top: ${"top" in this.anchorPoint ? this.anchorPoint.top : "unset"};
          bottom: ${"bottom" in this.anchorPoint
            ? this.anchorPoint.bottom
            : "unset"};
          left: ${"left" in this.anchorPoint ? this.anchorPoint.left : "unset"};
          right: ${"right" in this.anchorPoint
            ? this.anchorPoint.right
            : "unset"};

          width: ${this.width};
          height: ${this.height};
        }
      </style>

      <div
        class=${"floating-pane-container " +
        (this.shown ? "" : "d-none ") +
        "bg-light bg-gradient border shadow-lg px-2 py-2"}
      >
        <slot></slot>
      </div>`;
  }
}

export type FloatingPaneAnchorPoint =
  | { top: string; left: string }
  | { top: string; right: string }
  | { bottom: string; left: string }
  | { bottom: string; right: string };
