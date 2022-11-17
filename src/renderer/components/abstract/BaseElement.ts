import { Dropdown, Tooltip } from "bootstrap";
import { LitElement } from "lit";

export default abstract class BaseElement extends LitElement {
  disconnectedCallback(): void {
    this.removePopperTooltips();
    this.removePopperDropdowns();
  }

  protected popperTooltips: Tooltip[] = [];

  protected addPopperTooltips() {
    this.removePopperTooltips();

    this.popperTooltips = Array.from(
      this.renderRoot.querySelectorAll('[data-bs-toggle="tooltip"]')
    ).map((tooltipHost) => new Tooltip(tooltipHost));
  }

  protected removePopperTooltips() {
    this.popperTooltips.forEach((tooltip) => {
      tooltip.dispose();
    });
    this.popperTooltips = [];
  }

  protected popperDropdowns: Dropdown[] = [];
  protected dropdownHosts: Element[] = [];
  private toggleDropdownListenerFn = this.toggleDropdown.bind(this);
  private hideDropdownsListenerFn = this.hideDropdowns.bind(this);
  private keyDownListenerFn = this.keyDown.bind(this);

  protected addPopperDropdowns() {
    this.removePopperDropdowns();

    this.dropdownHosts = Array.from(
      this.renderRoot.querySelectorAll('[data-bs-toggle="dropdown"]')
    );

    this.popperDropdowns = this.dropdownHosts.map((dropdownHost) =>
      Dropdown.getOrCreateInstance(dropdownHost)
    );

    this.dropdownHosts.forEach((host) => {
      host.addEventListener("click", this.toggleDropdownListenerFn);
    });

    document.addEventListener("click", this.hideDropdownsListenerFn);
    document.addEventListener("keydown", this.keyDownListenerFn);
  }

  protected removePopperDropdowns() {
    document.removeEventListener("keydown", this.keyDownListenerFn);
    document.removeEventListener("click", this.hideDropdownsListenerFn);

    this.dropdownHosts.forEach((host) =>
      host.removeEventListener("click", this.toggleDropdownListenerFn)
    );
    this.dropdownHosts = [];

    this.popperDropdowns.forEach((dropdown) => {
      dropdown.dispose();
    });
    this.popperDropdowns = [];
  }

  protected dropdownVisiblityChanged() {}

  private toggleDropdown(event: Event) {
    const host = (event.target as HTMLElement).closest(
      '[data-bs-toggle="dropdown"]'
    );
    if (!host) return;

    if (!host.classList.contains("show")) {
      setTimeout(() => {
        Dropdown.getInstance(host)?.show();
        this.dropdownVisiblityChanged();
      });
    }
  }

  private hideDropdowns() {
    this.popperDropdowns.forEach((dropdown) => {
      dropdown.hide();
    });
    this.dropdownVisiblityChanged();
  }

  private keyDown(event: KeyboardEvent) {
    if (
      event.key === "Escape" &&
      this.dropdownHosts.some((host) => host.classList.contains("show"))
    ) {
      event.stopImmediatePropagation();
      this.hideDropdowns();
    }
  }
}
