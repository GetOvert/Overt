import { css, html } from "lit";
import { customElement, query } from "lit/decorators.js";
import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";

@customElement("overt-top-bar")
export default class TopBar extends BootstrapBlockElement {
  @query("overt-search-bar")
  private searchBar: HTMLInputElement;

  constructor() {
    super();

    this.addEventListener("focusSearchBar", () => {
      this.focusSearchBar();
    });
  }

  focusSearchBar(): void {
    this.searchBar.focus();
  }

  static styles = [
    BootstrapBlockElement.styles,
    css`
      .pane-button-sizing {
        width: 25vw;
        min-width: 200px;
        padding-left: 0.25rem;
        margin-right: 0.5rem;
      }

      overt-search-bar {
        flex: 1 0 40vw;
      }
    `,
  ];

  protected render() {
    return html`
      <header class="bg-light">
        <nav class="navbar navbar-light">
          <div class="container-fluid">
            <div class="d-flex pane-button-sizing">
              <openstore-settings-button
                class="me-auto"
                style="margin-left: -0.35rem"
              ></openstore-settings-button>

              <openstore-tasks-button
                class="ms-auto px-4"
                style="margin-right: -0.5rem"
              ></openstore-tasks-button>
            </div>

            <overt-search-bar></overt-search-bar>
          </div>
        </nav>
      </header>
    `;
  }
}
