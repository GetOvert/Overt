import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import {
  caskIdentifiersOfTask,
  CaskInstallTask,
  CaskUninstallTask,
  CaskUpgradeTask,
  QueuedTask,
} from "components/tasks/model/Task";
import taskQueue, { TaskQueueObserver } from "components/tasks/model/TaskQueue";
import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

@customElement("openstore-app-view")
export default class AppView extends BootstrapBlockElement {
  @property({ attribute: false })
  app: any = {};

  private taskQueueObserver: TaskQueueObserver;

  connectedCallback(): void {
    super.connectedCallback();

    this.taskQueueObserver = this.taskQueueChanged.bind(this);
    taskQueue.addObserver(this.taskQueueObserver);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();

    taskQueue.removeObserver(this.taskQueueObserver);
  }

  private taskQueueChanged(updatedTask: QueuedTask) {
    if (
      updatedTask.state === "succeeded" &&
      ["cask-reindex-all", "cask-reindex"].includes(updatedTask.type) &&
      caskIdentifiersOfTask(updatedTask)?.includes(this.app.full_token)
    ) {
      (window as any).openStore.displayPageForWindowLocation(
        document.querySelector("#content")
      );
    }
  }

  render() {
    // For Launch button
    const appFileName = this.app.artifacts
      .filter((artifact) => Array.isArray(artifact))
      ?.map(
        (candidateArray) =>
          candidateArray.filter(
            (fileName) =>
              typeof fileName.endsWith === "function" &&
              fileName.endsWith(".app")
          )?.[0]
      )?.[0];

    const fields = [
      {
        heading: "Description",
        value: this.app.desc ?? "No description available.",
      },
      {
        heading: "Website",
        value: html`<p>
          <a
            href=${this.app.homepage}
            @click=${(e) => {
              e.preventDefault();
              window.openExternalLink.open(this.app.homepage);
            }}
            >${this.app.homepage}</a
          >
        </p>`,
      },
      {
        heading: "Version",
        value:
          this.app.version +
          "\n" +
          (this.app.auto_updates
            ? "This app updates itself."
            : "This app does not update itself. You can install updates from OpenStore."),
      },
      {
        heading: "Requirements",
        value:
          this.app.depends_on && Object.keys(this.app.depends_on).length
            ? html`<ul>
                ${repeat(
                  this.app.depends_on.cask ?? [],
                  (appIdentifier) => html`<li>${appIdentifier}</li>`
                )}
                ${Object.keys(this.app.depends_on.macos ?? {}).map((operator) =>
                  this.app.depends_on.macos[operator].map(
                    (version) =>
                      html`<li>
                        macOS
                        ${(() =>
                          ({ ">=": "≥", "<=": "≤", "==": "=", "!=": "≠" }[
                            operator
                          ] ?? operator))()}
                        ${version}
                      </li>`
                  )
                )}
              </ul>`
            : null,
      },
      {
        heading: "Conflicts with",
        value:
          this.app.conflicts_with && Object.keys(this.app.conflicts_with).length
            ? html`<ul>
                ${repeat(
                  this.app.conflicts_with.cask ?? [],
                  (appIdentifier) => html`<li>${appIdentifier}</li>`
                )}
              </ul>`
            : null,
      },
      {
        heading: "Identifiers",
        value: [this.app.full_token, ...(this.app.aliases ?? [])].join(", "),
      },
      {
        heading: "Install count",
        value: [
          `30 days: ${this.app.installed_30d}`,
          `90 days: ${this.app.installed_90d}`,
          `365 days: ${this.app.installed_365d}`,
        ],
      },
    ];

    return html`
      ${BootstrapBlockElement.styleLink}
      
      <div class="mx-4">
        <h2 class="h3 text-muted text-center mt-1 mb-4">${
          this.app.full_token
        }</h2>

        <div class="openstore-apps-buttons-container text-center mb-4">
          <button
            class="openstore-button-install btn btn-success ${
              this.app.installed !== null ? "d-none" : ""
            }"
            style="min-width: 32vw; height: 2.7rem"
            @click=${async () => {
              taskQueue.push({
                label: `Install ${this.app.name[0]}`,
                type: "cask-install",
                caskIdentifier: this.app.full_token,
              } as CaskInstallTask);
            }}
          >
            Install
          </button>
            <button
              class="openstore-button-launch btn btn-primary ${
                this.app.installed === null || !appFileName ? "d-none" : ""
              }"
              style="min-width: 16vw; height: 2.7rem"
              @click=${() => {
                window.openProduct.openApp(appFileName);
              }}
            >
              Launch
            </button>
            <button
              class="openstore-button-update btn btn-success ${
                this.app.installed === null || this.app.auto_updates
                  ? "d-none"
                  : ""
              }"
              style="min-width: 16vw; height: 2.7rem"
              @click=${async () => {
                taskQueue.push({
                  label: `Update ${this.app.name[0]}`,
                  type: "cask-upgrade",
                  caskIdentifier: this.app.full_token,
                } as CaskUpgradeTask);
              }}
            >
              Update
            </button>
            <button
              class="openstore-button-uninstall btn btn-danger ${
                this.app.installed === null ? "d-none" : ""
              }"
              style="min-width: 16vw; height: 2.7rem"
              @click=${async () => {
                taskQueue.push({
                  label: `Uninstall ${this.app.name[0]}`,
                  type: "cask-uninstall",
                  caskIdentifier: this.app.full_token,
                } as CaskUninstallTask);
              }}
            >
              Uninstall
            </button>
          </div>

          ${repeat(
            fields,
            ({ heading }) => heading,
            ({ heading, value }) =>
              value
                ? html` <h3>${heading}</h3>
                    ${(() => {
                      if (Array.isArray(value)) {
                        return html`
                          <ul>
                            ${repeat(value, (item) => html`<li>${item}</li>`)}
                          </ul>
                        `;
                      }
                      if (value && typeof value === "string") {
                        return html`
                          <p style="white-space: pre-wrap">${value}</p>
                        `;
                      }
                      if (value) {
                        return html`${value}`;
                      }
                      return html``;
                    })()}`
                : ""
          )}
        </div>
      </div>
    `;
  }
}
