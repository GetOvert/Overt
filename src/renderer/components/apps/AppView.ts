import { Button, Field, ProductView } from "components/products/ProductView";
import {
  caskIdentifiersOfTask,
  CaskInstallTask,
  CaskUninstallTask,
  CaskUpgradeTask,
  QueuedTask,
} from "components/tasks/model/Task";
import taskQueue, { TaskQueueObserver } from "components/tasks/model/TaskQueue";
import { html, HTMLTemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

@customElement("openstore-app-view")
export default class AppView extends ProductView {
  @property({ attribute: false })
  app: any = {};

  protected get subtitle(): string {
    return this.app.full_token;
  }

  protected shouldCauseRerender(successfulTask: QueuedTask): boolean {
    return (
      ["cask-reindex-all", "cask-reindex"].includes(successfulTask.type) &&
      caskIdentifiersOfTask(successfulTask)?.includes(this.app.full_token)
    );
  }

  protected get fields(): Field[] {
    return [
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
  }

  protected get buttons(): Button[] {
    return [
      {
        title: "Install",
        color: "success",
        shown: this.app.installed === null,
        onClick: async () => {
          taskQueue.push(
            {
              label: `Install ${this.app.name[0]}`,
              type: "cask-install",
              caskIdentifier: this.app.full_token,
            } as CaskInstallTask,
            ["before", "after"]
          );
        },
      },
      {
        title: "Launch",
        color: "primary",
        shown: this.app.installed !== null && !!this.appFileName,
        onClick: async () => {
          window.openProduct.openApp(this.appFileName);
        },
      },
      {
        title: "Update",
        color: "success",
        shown: this.app.installed !== null && !this.app.auto_updates,
        onClick: async () => {
          taskQueue.push(
            {
              label: `Update ${this.app.name[0]}`,
              type: "cask-upgrade",
              caskIdentifier: this.app.full_token,
            } as CaskUpgradeTask,
            ["before", "after"]
          );
        },
      },
      {
        title: "Uninstall",
        color: "danger",
        shown: this.app.installed !== null,
        onClick: async () => {
          taskQueue.push(
            {
              label: `Uninstall ${this.app.name[0]}`,
              type: "cask-uninstall",
              caskIdentifier: this.app.full_token,
            } as CaskUninstallTask,
            ["before", "after"]
          );
        },
      },
    ];
  }

  private get appFileName(): string | null {
    return this.app.artifacts
      .filter((artifact) => Array.isArray(artifact))
      ?.map(
        (candidateArray) =>
          candidateArray.filter(
            (fileName) =>
              typeof fileName.endsWith === "function" &&
              fileName.endsWith(".app")
          )?.[0]
      )?.[0];
  }
}
