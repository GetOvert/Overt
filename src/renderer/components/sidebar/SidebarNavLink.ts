import LightDOMBlockElement from "components/abstract/LightDOMBlockElement";
import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { ifDefined } from "lit/directives/if-defined.js";

@customElement("openstore-sidebar-nav-link")
export default class SidebarNavLink extends LightDOMBlockElement {
  get customElementName(): string {
    return "openstore-sidebar-nav-link";
  }

  @property()
  href: string | null = null;
  @property()
  label = "";
  @property({ type: Boolean, reflect: true })
  active = false;

  constructor() {
    super();
  }

  render() {
    return html`
      <a
        href=${this.href ?? "#"}
        class=${classMap({
          "nav-link": true,
          active: this.active,
        })}
        style="--bs-nav-link-padding-y: 0.375rem"
        aria-current="${ifDefined(this.active ? "page" : null)}"
        @click=${this.clicked}
      >
        ${this.label}
      </a>
    `;
  }

  private clicked(event: Event) {
    event.preventDefault();

    if (this.href) {
      ((window as any).openStore as any).updateWindowLocationFragment(
        this.href
      );
    }
  }
}
