import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import { css, html, HTMLTemplateResult, PropertyValues } from "lit";
import { customElement, state } from "lit/decorators.js";
import taskQueue from "tasks/TaskQueue";
import {
  AddSourceRepositoryTask,
  ReindexAllTask,
  RemoveSourceRepositoryTask,
} from "tasks/Task";
import SourceRepositoriesModal from "components/modal/SourceRepositoriesModal";
import { allPackageMangers } from "package-manager/PackageManagerRegistry";

@customElement("openstore-settings-pane")
export class SettingsPane extends BootstrapBlockElement {
  @state()
  homebrewPath: string;
  @state()
  validateCodeSignatures: boolean;
  @state()
  sendNativeNotifications: boolean;

  protected updated(changedProperties: PropertyValues<this>): void {
    this.addPopperTooltips();
    this.fetchSettingsValues();
  }

  private async fetchSettingsValues() {
    this.homebrewPath = await window.settings.get("homebrewPath");
    this.validateCodeSignatures = await window.settings.get(
      "validateCodeSignatures"
    );
    this.sendNativeNotifications = await window.settings.get(
      "sendNativeNotifications"
    );
  }

  static styles = [
    BootstrapBlockElement.styles,
    css`
      :host {
        display: flex;
        flex-direction: column;
      }
      .settings-pane-heading {
        font-size: 1.2rem;
        font-weight: normal;
      }
    `,
  ];

  render() {
    return html`${BootstrapBlockElement.styleLink}
      <div
        class="d-flex align-items-center justify-content-between border-bottom mx-2 pb-2"
      >
        <h2 class="settings-pane-heading text-center mt-2">Settings</h2>
      </div>

      <div class="d-flex flex-column overflow-auto m-2 mt-3">
        ${this.makeCheckbox(
          "sendNativeNotifications",
          "Send Notifications",
          "When enabled, Overt will send you desktop notifications when major tasks are started or completed. Enabled by default.",
          this.sendNativeNotifications
        )}
        ${this.makeCheckbox(
          "validateCodeSignatures",
          "Validate Code Signatures",
          "When enabled, macOS will validate the digital signature of apps installed through Overt. This blocks both malware and unsigned legitimate software from running. Enabled by default.",
          this.validateCodeSignatures
        )}
        ${this.makeButton(
          "Sources",
          "Add/remove additional software sources. Reminder: Avoiding malware is your responsibility.",
          "primary",
          this.showSourceRepositories.bind(this)
        )}

        <hr class="mt-2" />

        <label
          class="mb-3"
          data-bs-toggle="tooltip"
          data-bs-placement="right"
          title="Path to root directory of the Homebrew installation to use. The standard location for arm64 (“Apple silicon”) architecture is /opt/homebrew, and the standard location for x86_64 (“Intel”) architecture is /usr/local. There are two reasons to change this setting: 1) You want to switch Homebrew architectures on an arm64 Mac; 2) You have installed Homebrew in a custom location."
        >
          Homebrew Path
          <input
            type="text"
            class="form-control form-control-sm"
            name="homebrewPath"
            value=${this.homebrewPath}
            @change=${this.onTextBoxChanged}
          />
        </label>

        ${this.makeButton(
          "Rebuild Catalog",
          "Replace Overt's catalog with a fresh copy from the package manager. This may take a minute or two.",
          "secondary",
          this.rebuildIndex.bind(this)
        )}
      </div> `;
  }

  private makeCheckbox(
    name: string,
    label: string,
    tooltip: string,
    checked: boolean
  ): HTMLTemplateResult {
    return html`
      <label
        class="mb-3"
        data-bs-toggle="tooltip"
        data-bs-placement="right"
        title=${tooltip}
        @mousedown=${(event: Event) => event.preventDefault()}
        @click=${(event: Event) => {
          if ((event.target as HTMLElement).tagName === "LABEL") {
            // Prevent checkbox gaining focus
            event.preventDefault();
            (event.target as HTMLLabelElement).control!.click();
          }
        }}
      >
        <input
          type="checkbox"
          class="form-check-input me-1"
          name=${name}
          ?checked=${checked}
          @change=${this.onCheckboxClicked}
          @mousedown=${(event: Event) => event.preventDefault()}
        />
        ${label}
      </label>
    `;
  }

  private makeButton(
    label: string,
    tooltip: string,
    color: string,
    action: () => void
  ) {
    return html`
      <button
        type="button"
        class="btn btn-outline-${color} mb-3"
        data-bs-toggle="tooltip"
        data-bs-placement="right"
        title=${tooltip}
        @click=${action}
      >
        ${label}
      </button>
    `;
  }

  private onCheckboxClicked(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    window.settings.set(checkbox.name, checkbox.checked);
  }

  private onTextBoxChanged(event: Event) {
    const textBox = event.target as HTMLInputElement;
    window.settings.set(textBox.name, textBox.value);
  }

  private async showSourceRepositories() {
    const sourceRepositoryChanges = await SourceRepositoriesModal.runModal(
      await window.sourceRepositories.all(),
      "Each source is associated with a package manager, and has a unique name and repository URL.\nYou can use any supported package manager that is currently installed.",
      "Sources"
    );

    for (const {
      action,
      sourceRepository: { packageManager, name, url },
    } of sourceRepositoryChanges) {
      switch (action) {
        case "add":
          taskQueue.push({
            type: "add-source-repository",
            label: `Add source ${name} to ${packageManager}`,
            packageManager,
            name,
            url,
          } as AddSourceRepositoryTask);
          break;
        case "remove":
          taskQueue.push({
            type: "remove-source-repository",
            label: `Remove source ${name} from ${packageManager}`,
            packageManager,
            name,
          } as RemoveSourceRepositoryTask);
          break;
      }
    }
  }

  private rebuildIndex() {
    for (const packageManager of allPackageMangers) {
      taskQueue.push(
        {
          packageManager,
          type: "reindex-all",
          label: `Rebuild catalog (${packageManager})`,
          condition: "always",
          wipeIndexFirst: true,
        } as ReindexAllTask,
        ["before", "after"]
      );
    }
  }
}
