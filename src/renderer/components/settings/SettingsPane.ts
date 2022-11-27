import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import { css, html, HTMLTemplateResult, PropertyValues } from "lit";
import { customElement, state } from "lit/decorators.js";
import taskQueue from "tasks/TaskQueue";
import {
  AddSourceRepositoryTask,
  PackageManagerTaskBase,
  QueuedTask,
  ReindexAllTask,
  RemoveSourceRepositoryTask,
} from "tasks/Task";
import SourceRepositoriesModal from "components/modal/SourceRepositoriesModal";
import { allPackageMangers } from "package-manager/PackageManagerRegistry";
import { Config } from "shared/config";

@customElement("openstore-settings-pane")
export class SettingsPane extends BootstrapBlockElement {
  @state()
  validateCodeSignatures: boolean;
  @state()
  sendNativeNotifications: boolean;

  @state()
  useSystemAccentColor: boolean;
  @state()
  tintDarkBackgrounds: boolean;

  @state()
  fullIndexIntervalDays: number;

  @state()
  autoUpdateSelf: boolean;
  @state()
  homebrewPath: string;

  protected updated(changedProperties: PropertyValues<this>): void {
    this.addPopperTooltips();
    this.fetchSettingsValues();
  }

  private async fetchSettingsValues() {
    const keys: (keyof this & keyof Config)[] = [
      "validateCodeSignatures",
      "sendNativeNotifications",
      "useSystemAccentColor",
      "tintDarkBackgrounds",
      "fullIndexIntervalDays",
      "autoUpdateSelf",
      "homebrewPath",
    ];

    const valueEntries = await Promise.all(
      keys.map(async (key) => [key, await window.settings.get(key)])
    );

    Object.assign(this, Object.fromEntries(valueEntries));
  }

  static styles = [
    BootstrapBlockElement.styles,
    css`
      :host {
        display: flex;
        flex-direction: column;
      }
      * {
        user-select: none;
      }

      h2 {
        font-size: 1.2rem;
        font-weight: normal;
      }

      h3 {
        font-size: 1.05rem;
        font-weight: bold;

        margin-right: 1rem;
      }
      h3:not(:first-child) {
        margin-top: 0.5rem;
      }

      hr {
        flex-shrink: 0;
        margin-top: 0;
        margin-right: 1rem;
      }

      label:not(:last-child) {
        margin-bottom: 1rem;
      }
    `,
  ];

  render() {
    return html`
      <div
        class="d-flex align-items-center justify-content-between border-bottom mx-2 pb-2"
      >
        <h2 class="text-center mt-2">Settings</h2>
      </div>

      <div class="d-flex flex-column overflow-auto p-2 pt-3">
        <h3
          data-bs-toggle="tooltip"
          data-bs-placement="right"
          title="Configure basic settings"
        >
          General
        </h3>
        <hr aria-hidden="true" />

        ${this.makeCheckbox(
          "sendNativeNotifications",
          "Desktop notifications",
          "Send desktop notifications for requested tasks? (Default: Yes)"
        )}
        ${this.makeCheckbox(
          "validateCodeSignatures",
          "Use macOS Gatekeeper",
          "Ask Gatekeeper to check downloads? Blocks known malware and some legitimate software. (Default: Yes)"
        )}

        <h3
          data-bs-toggle="tooltip"
          data-bs-placement="right"
          title="Personalize!"
        >
          Appearance
        </h3>
        <hr aria-hidden="true" />

        ${this.makeCheckbox(
          "useSystemAccentColor",
          "Use system accent color",
          "Use the accent color you've chosen in your system settings? (Default: No)"
        )}
        ${this.makeCheckbox(
          "tintDarkBackgrounds",
          "Tint dark backgrounds",
          "Tint backgrounds in dark theme? (Default: No)"
        )}

        <h3
          data-bs-toggle="tooltip"
          data-bs-placement="right"
          title="Configure Overt's index of available and installed software"
        >
          Catalog
        </h3>
        <hr aria-hidden="true" />

        ${this.makeStepperField(
          "fullIndexIntervalDays",
          "Auto-rebuild catalog every",
          "How often to rebuild the software catalog at launch. Shorter intervals provide more up-to-date information. (Default: Every 3 days)",
          {
            min: 0,
            unitLabel: "days",
          }
        )}
        ${this.makeButton(
          "Edit Sources",
          "Add or remove software sources. Only add sources you trust.",
          "primary",
          this.showSourceRepositories.bind(this)
        )}
        ${this.makeButton(
          "Rebuild Now",
          "Replace the catalog with a fresh copy. This will take a few seconds, or a minute or two if you're offline.",
          "info",
          this.rebuildIndex.bind(this)
        )}

        <h3
          data-bs-toggle="tooltip"
          data-bs-placement="right"
          title="If you know what you're doing"
        >
          Advanced
        </h3>
        <hr aria-hidden="true" />

        ${this.makeCheckbox(
          "autoUpdateSelf",
          "Automatically update Overt",
          "Auto-update the Overt app? Overt may break if you disable this, since underlying package managers will continue to be updated. (Default: Yes)"
        )}
        ${this.makeButton(
          "Set Up Package Managers",
          "Relaunch Overt into initial setup mode to configure package managers.",
          "primary",
          this.enterSetup.bind(this)
        )}
      </div>
    `;
  }

  private makeCheckbox(
    name: keyof this,
    label: string,
    tooltip: string
  ): HTMLTemplateResult {
    return html`
      <label
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
          ?checked=${this[name]}
          @change=${this.onCheckboxClicked}
          @mousedown=${(event: Event) => event.preventDefault()}
        />
        ${label}
      </label>
    `;
  }

  private makeTextField(name: keyof this, label: string, tooltip: string) {
    return html`
      <label
        data-bs-toggle="tooltip"
        data-bs-placement="right"
        title=${tooltip}
      >
        ${label}

        <input
          type="text"
          class="form-control form-control-sm mt-1"
          name=${name}
          value=${this[name]}
          @change=${this.onTextFieldChanged}
        />
      </label>
    `;
  }

  private makeStepperField(
    name: keyof this,
    label: string,
    tooltip: string,
    {
      min,
      max,
      unitLabel,
    }: {
      min?: number;
      max?: number;
      unitLabel?: string;
    } = {}
  ) {
    return html`
      <label
        data-bs-toggle="tooltip"
        data-bs-placement="right"
        title=${tooltip}
      >
        ${label}

        <div class="d-flex align-items-baseline mt-1">
          <input
            type="number"
            class="form-control form-control-sm"
            name=${name}
            value=${this[name]}
            min=${min}
            max=${max}
            @change=${this.onNumericTextFieldChanged}
          />

          ${unitLabel && html`<div class="ms-2">${unitLabel}</div>`}
        </div>
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
    window.settings.set(checkbox.name as keyof Config, checkbox.checked);
  }

  private onTextFieldChanged(event: Event) {
    const textField = event.target as HTMLInputElement;
    window.settings.set(textField.name as keyof Config, textField.value);
  }

  private onNumericTextFieldChanged(event: Event) {
    const textField = event.target as HTMLInputElement;
    window.settings.set(
      textField.name as keyof Config,
      Number(textField.value)
    );
  }

  private async showSourceRepositories() {
    const sourceRepositoryChanges = await SourceRepositoriesModal.runModal(
      await window.sourceRepositories.all(),
      "Each source is associated with a package manager, and has a unique name and repository URL.\nYou can use any supported package manager that is currently installed.",
      "Catalog Sources"
    );

    const results = await Promise.all(
      sourceRepositoryChanges.map(
        ({ action, sourceRepository: { packageManager, name, url } }) => {
          switch (action) {
            case "add":
              return taskQueue.push({
                type: "add-source-repository",
                label: `Add source ${name} to ${packageManager}`,
                packageManager,
                name,
                url,
              } as AddSourceRepositoryTask);
            case "remove":
              return taskQueue.push({
                type: "remove-source-repository",
                label: `Remove source ${name} from ${packageManager}`,
                packageManager,
                name,
              } as RemoveSourceRepositoryTask);
          }
        }
      )
    );

    const packageManagerNames = new Set(
      results
        .filter(({ state }) => state === "succeeded")
        .flatMap(({ task }: QueuedTask) => {
          const taskPackageManagerName = (task as PackageManagerTaskBase)
            .packageManager;

          // In the case of Homebrew, we need brew-cask to be indexed as well.
          // TODO: Abstract this case
          return taskPackageManagerName === "brew"
            ? ["brew", "brew-cask"]
            : [taskPackageManagerName];
        })
    );
    for (const packageManagerName of packageManagerNames) {
      taskQueue.push<ReindexAllTask>(
        {
          type: "reindex-all",
          label: `Rebuild catalog (${packageManagerName})`,
          packageManager: packageManagerName,
          condition: "always",
          wipeIndexFirst: true,
        },
        ["before", "after"]
      );
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

  private enterSetup() {
    window.settings.set("showSetupOnNextLaunch", true);
    window.lifecycle.relaunch();
  }
}
