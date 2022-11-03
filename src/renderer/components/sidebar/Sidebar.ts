import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import "components/sidebar/SidebarNavLink";
import { css, html } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("openstore-sidebar")
export default class Sidebar extends BootstrapBlockElement {
  constructor() {
    super();
  }

  static styles = [
    BootstrapBlockElement.styles,
    css`
      :host {
        max-width: 300px;
      }
      :host > div {
        max-height: 100%;
      }
    `,
  ];

  render() {
    return html`
      <div
        class="d-flex flex-column justify-content-between overflow-auto pt-3 px-0"
      >
        <nav class="nav nav-pills nav-fill flex-column">
          <span class="fs-6 fw-bold text-uppercase ms-2 mt-1 mb-2">Source</span>

          ${window.platform.getNodePlatformString() === "darwin"
            ? html`
                <openstore-sidebar-nav-link
                  href=${(window as any).openStore.encodeFragment({
                    source: "brew-cask",
                  })}
                  label="Apps (brew cask)"
                  ?active=${(window as any).openStore.decodeFragment(
                    window.location.hash
                  ).source === "brew-cask"}
                ></openstore-sidebar-nav-link>
                <openstore-sidebar-nav-link
                  href=${((window as any).openStore as any).encodeFragment({
                    source: "brew",
                  })}
                  label="Tools & Libraries (brew)"
                  ?active=${(window as any).openStore.decodeFragment(
                    window.location.hash
                  ).source === "brew"}
                ></openstore-sidebar-nav-link>
              `
            : html`
                <openstore-sidebar-nav-link
                  href=${(window as any).openStore.encodeFragment({
                    source: "winget",
                  })}
                  label="Windows Package Manager (winget)"
                  ?active=${(window as any).openStore.decodeFragment(
                    window.location.hash
                  ).source === "winget"}
                ></openstore-sidebar-nav-link>
              `}
        </nav>

        <nav class="nav nav-pills nav-fill flex-column">
          <span class="fs-6 fw-bold text-uppercase ms-2 mt-3 mb-2">Filter</span>

          <openstore-sidebar-nav-link
            href=${((window as any).openStore as any).encodeFragment({
              filter: "all",
            })}
            label="All"
            ?active=${(window as any).openStore.decodeFragment(
              window.location.hash
            ).filter === "all"}
          ></openstore-sidebar-nav-link>
          <openstore-sidebar-nav-link
            href=${((window as any).openStore as any).encodeFragment({
              filter: "available",
            })}
            label="Available"
            ?active=${(window as any).openStore.decodeFragment(
              window.location.hash
            ).filter === "available"}
          ></openstore-sidebar-nav-link>
          <openstore-sidebar-nav-link
            href=${((window as any).openStore as any).encodeFragment({
              filter: "installed",
            })}
            label="Installed"
            ?active=${(window as any).openStore.decodeFragment(
              window.location.hash
            ).filter === "installed"}
          ></openstore-sidebar-nav-link>
          <openstore-sidebar-nav-link
            href=${((window as any).openStore as any).encodeFragment({
              filter: "updates",
            })}
            label="Updates"
            ?active=${(window as any).openStore.decodeFragment(
              window.location.hash
            ).filter === "updates"}
          ></openstore-sidebar-nav-link>
        </nav>

        <nav class="nav nav-pills nav-fill flex-column">
          <span class="fs-6 fw-bold text-uppercase ms-2 mt-3 mb-2"
            >Sort by</span
          >

          <openstore-sidebar-nav-link
            href=${((window as any).openStore as any).encodeFragment({
              sort: "installed-30d",
            })}
            label="Most Installed (30 Days)"
            ?active=${(window as any).openStore.decodeFragment(
              window.location.hash
            ).sort === "installed-30d"}
          ></openstore-sidebar-nav-link>
          <openstore-sidebar-nav-link
            href=${((window as any).openStore as any).encodeFragment({
              sort: "installed-90d",
            })}
            label="Most Installed (90 Days)"
            ?active=${(window as any).openStore.decodeFragment(
              window.location.hash
            ).sort === "installed-90d"}
          ></openstore-sidebar-nav-link>
          <openstore-sidebar-nav-link
            href=${((window as any).openStore as any).encodeFragment({
              sort: "installed-365d",
            })}
            label="Most Installed (365 Days)"
            ?active=${(window as any).openStore.decodeFragment(
              window.location.hash
            ).sort === "installed-365d"}
          ></openstore-sidebar-nav-link>
          <!-- <openstore-sidebar-nav-link
            href=${((window as any).openStore as any).encodeFragment({
            sort: "updated",
          })}
            label="Recently Updated"
          ></openstore-sidebar-nav-link>
          <openstore-sidebar-nav-link
            href=${((window as any).openStore as any).encodeFragment({
            sort: "added",
          })}
            label="Newly Added"
          ></openstore-sidebar-nav-link> -->
        </nav>
      </div>
    `;
  }
}
