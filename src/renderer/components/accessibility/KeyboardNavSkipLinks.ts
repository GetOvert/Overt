import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import TopBar from "components/top-bar/TopBar";
import { html } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("overt-keyboard-nav-skip-links")
export default class KeyboardNavSkipLinks extends BootstrapBlockElement {
  protected render() {
    return html`
      <nav class="visually-hidden-focusable nav nav-pills mx-2">
        <a class="nav-link" href="#" @click=${this.skipToSearch}>
          Skip to search
        </a>
      </nav>
    `;
  }

  private skipToSearch(event: Event) {
    event.preventDefault();

    const topBar = document.querySelector("overt-top-bar") as TopBar;
    topBar.focusSearchBar();
  }
}
