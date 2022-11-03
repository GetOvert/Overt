import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import FloatingPane from "components/ui-elements/floating-pane/FloatingPane";
import { html } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("openstore-terminal-button")
export default class TerminalButton extends BootstrapBlockElement {
  get pane(): FloatingPane {
    return document.querySelector("#openstore-terminal-pane")!;
  }

  constructor() {
    super();
  }

  static styles = [BootstrapBlockElement.styles];

  render() {
    return html`
      <button
        class="openstore-jsnav-toggle-link btn btn-outline-dark"
        @click=${this.toggleShown}
      >
        View Log
      </button>
    `;
  }

  toggleShown() {
    this.pane.shown = !this.pane.shown;

    const button = this.renderRoot.querySelector("button")!;

    if (this.pane.shown) button.classList.add("active");
    else button.classList.remove("active");

    ((window as any).openStore as any).fitTerminal();
  }
}
