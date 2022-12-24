import LightDOMBlockElement from "components/abstract/LightDOMBlockElement";
import { html, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";

@customElement("openstore-sidebar-nav-link")
export default class SidebarNavLink extends LightDOMBlockElement {
  get customElementName(): string {
    return "openstore-sidebar-nav-link";
  }

  @property()
  key: string;

  @property()
  options: {
    value: string;
    label: string;
  }[] = [];

  @state()
  value: string;
  @state()
  label = "";

  private get currentValue() {
    return (window as any).openStore.decodeFragment(window.location.hash)[
      this.key
    ];
  }

  private get currentOption() {
    return this.options.find(({ value }) => value === this.currentValue);
  }

  private get active(): boolean {
    return !!this.currentOption;
  }

  constructor() {
    super();
  }

  protected firstUpdated(changedProperties: PropertyValues<this>): void {
    const primaryOption = this.currentOption ?? this.options[0];

    this.value = primaryOption.value;
    this.label = primaryOption.label;
  }

  protected updated(changedProperties: PropertyValues<this>): void {
    this.addPopperDropdowns();
  }

  render() {
    const buttonHTML = html`
      <a
        href=${(window as any).openStore.encodeFragment({
          [this.key]: this.value,
        })}
        data-value=${this.value}
        data-label=${this.label}
        class="nav-link flex-grow-1${this.active ? " active" : ""}"
        style="--bs-nav-link-padding-y: 0.375rem"
        aria-current=${ifDefined(this.active ? "page" : null)}
        @click=${this.clicked}
      >
        ${this.label}
      </a>
    `;

    if (this.options.length <= 1) return buttonHTML;

    const dropdownID = `sidebar-nav-link-${this.label.replace(/\W/g, "")}`;
    return html`
      <div class="btn-group dropup d-flex" role="group">
        ${buttonHTML}

        <button
          id=${dropdownID}
          type="button"
          class="btn btn-light dropdown-toggle dropdown-toggle-split flex-grow-0 dropdown-button hidden-unless-parent-hovered"
          data-bs-toggle="dropdown"
          data-bs-placement="bottom"
          aria-haspopup="true"
          aria-label="Toggle more options dropdown"
        ></button>
        <ul class="dropdown-menu" aria-labelledby=${dropdownID}>
          ${this.options.map(
            ({ value, label }) => html`
              <li>
                <a
                  class="dropdown-item"
                  href=${(window as any).openStore.encodeFragment({
                    [this.key]: value,
                  })}
                  data-value=${value}
                  data-label=${label}
                  @click=${this.clicked}
                >
                  ${label}
                </a>
              </li>
            `
          )}
        </ul>
      </div>
    `;
  }

  private clicked(event: Event): void {
    event.preventDefault();

    const link = event.target as HTMLAnchorElement;

    this.value = link.dataset["value"]!;
    this.label = link.innerText.trim();

    ((window as any).openStore as any).updateWindowLocationFragment(
      (window as any).openStore.encodeFragment({
        [this.key]: this.value,
      })
    );
  }

  protected dropdownVisibilityChanged(): void {
    const dropdownButton = this.renderRoot.querySelector(".dropdown-button");
    if (!dropdownButton) return;

    const dropdownShown = this.dropdownHosts[0]?.classList.contains("show");
    if (dropdownShown)
      dropdownButton.classList.remove("hidden-unless-parent-hovered");
    else dropdownButton.classList.add("hidden-unless-parent-hovered");
  }
}
