import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import "components/sidebar/SidebarNavLink";
import SidebarNavLink from "components/sidebar/SidebarNavLink";
import { css, html } from "lit";
import { customElement, query } from "lit/decorators.js";

@customElement("openstore-sidebar")
export default class Sidebar extends BootstrapBlockElement {
  constructor() {
    super();
  }

  @query("openstore-sidebar-nav-link")
  private readonly firstNavLink: SidebarNavLink;

  focus(options?: FocusOptions | undefined): void {
    this.firstNavLink?.focus(options);
  }

  static styles = [
    BootstrapBlockElement.styles,
    css`
      :host > div {
        max-height: 100%;
      }

      .heading {
        font-size: 1.05rem;
        font-weight: bold;
      }

      .nav:not(:last-child) {
        border-bottom: var(--bs-border-width) var(--bs-border-style)
          var(--bs-border-color);
      }

      a {
        -webkit-user-drag: none;
      }
    `,
  ];

  render() {
    return html`
      <div
        class="d-flex flex-column justify-content-between overflow-auto pt-2 px-0"
      >
        <nav class="nav nav-pills nav-fill flex-column">
          <span class="heading ps-2 mt-1 mb-1">Source</span>

          ${window.platform.getNodePlatformString() === "darwin"
            ? html`
                <openstore-sidebar-nav-link
                  key="source"
                  .options=${[
                    {
                      value: "brew-cask",
                      label: "brew \u2013 Apps",
                    },
                  ]}
                ></openstore-sidebar-nav-link>
                <openstore-sidebar-nav-link
                  key="source"
                  .options=${[
                    {
                      value: "brew",
                      label: "brew \u2013 Tools & Libraries",
                    },
                  ]}
                ></openstore-sidebar-nav-link>
              `
            : html`
                <openstore-sidebar-nav-link
                  key="source"
                  .options=${[
                    {
                      value: "winget",
                      label: "Windows Package Manager (winget)",
                    },
                  ]}
                ></openstore-sidebar-nav-link>
              `}
        </nav>

        <nav class="nav nav-pills nav-fill flex-column">
          <span class="heading ps-2 mt-3 mb-1">Filter</span>

          <openstore-sidebar-nav-link
            key="filter"
            .options=${[
              {
                value: "all",
                label: "All",
              },
            ]}
          ></openstore-sidebar-nav-link>
          <openstore-sidebar-nav-link
            key="filter"
            .options=${[
              {
                value: "available",
                label: "Available",
              },
            ]}
          ></openstore-sidebar-nav-link>
          <openstore-sidebar-nav-link
            key="filter"
            .options=${[
              {
                value: "installed",
                label: "Installed",
              },
            ]}
          ></openstore-sidebar-nav-link>
          <openstore-sidebar-nav-link
            key="filter"
            .options=${[
              {
                value: "updates",
                label: "Updates",
              },
            ]}
          ></openstore-sidebar-nav-link>
        </nav>

        <nav class="nav nav-pills nav-fill flex-column">
          <span class="heading ps-2 mt-3 mb-1">Sort</span>

          <openstore-sidebar-nav-link
            key="sort"
            .options=${[
              {
                value: "installed-30d",
                label: "Installs \u2013 30\u00a0Days",
              },
              {
                value: "installed-90d",
                label: "Installs \u2013 90\u00a0Days",
              },
              {
                value: "installed-365d",
                label: "Installs \u2013 365\u00a0Days",
              },
            ]}
          ></openstore-sidebar-nav-link>
          <openstore-sidebar-nav-link
            key="sort"
            .options=${[
              {
                value: "updated",
                label: "Last Updated",
              },
              /*
              {
                value: "added",
                label: "First Added",
              },
              */
            ]}
          ></openstore-sidebar-nav-link>
        </nav>
      </div>
    `;
  }
}
