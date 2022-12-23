import { css, html } from "lit";
import { customElement, query } from "lit/decorators.js";
import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";

@customElement("overt-search-bar")
export default class SearchBar extends BootstrapBlockElement {
  @query("input[type=search]")
  private inputField: HTMLInputElement;

  static styles = [
    BootstrapBlockElement.styles,
    css`
      input[type="search"]:placeholder-shown {
        text-transform: uppercase;
        font-size: 13px;
        padding: 8px 12px;
      }
    `,
  ];

  protected render() {
    return html`
      <form class="d-flex" @submit=${(event: Event) => event.preventDefault()}>
        <input
          class="form-control me-2"
          type="search"
          placeholder="Search"
          aria-label="Search"
          @input=${this.searchQueryChanged}
        />
      </form>
    `;
  }

  private searchQueryChanged(event: Event) {
    event.preventDefault();

    (window as any).openStore.updateWindowLocationFragment({
      ...(window as any).openStore.decodeFragment(window.location.hash),
      search: (event.target as HTMLInputElement).value ?? "",
      subpage: null,
    });
  }

  focus(options?: FocusOptions | undefined): void {
    this.inputField.focus(options);
    this.inputField.select();
  }
}
