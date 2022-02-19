import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import { css, html, HTMLTemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { Tooltip } from "bootstrap";
import taskQueue from "components/tasks/model/TaskQueue";
import { CaskReindexAllTask } from "components/tasks/model/Task";

@customElement("openstore-settings-pane")
export class SettingsPane extends BootstrapBlockElement {
  @state()
  homebrewPath: string;
  @state()
  validateCodeSignatures: boolean;
  @state()
  sendNativeNotifications: boolean;

  protected updated(
    changedProperties: Map<string | number | symbol, unknown>
  ): void {
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
        <h2 class="settings-pane-heading text-center mt-2">Options</h2>
      </div>

      <div class="d-flex flex-column justify-content-around m-2 mt-3">
        ${this.makeCheckbox(
          "sendNativeNotifications",
          "Send Notifications",
          "When enabled, OpenStore will send you desktop notifications when major tasks are started or completed. Enabled by default.",
          this.sendNativeNotifications
        )}
        ${this.makeCheckbox(
          "validateCodeSignatures",
          "Validate Code Signatures",
          "When enabled, macOS will validate the digital signature of apps installed through OpenStore. This blocks both malware and unsigned legitimate software from running. Enabled by default.",
          this.validateCodeSignatures
        )}

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

        <button
          class="btn btn-outline-secondary mb-3"
          data-bs-toggle="tooltip"
          data-bs-placement="right"
          title="Replace OpenStore's catalog with a fresh copy from the package manager. This may take a few minutes."
          @click=${this.rebuildIndex}
        >
          Rebuild Catalog
        </button>
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
            (event.target as HTMLLabelElement).control.click();
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

  private popperTooltips: any;
  private addPopperTooltips() {
    this.popperTooltips = Array.from(
      this.renderRoot.querySelectorAll('[data-bs-toggle="tooltip"]')
    ).map((tooltipHost) => new Tooltip(tooltipHost));
  }

  private onCheckboxClicked(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    window.settings.set(checkbox.name, checkbox.checked);
  }

  private onTextBoxChanged(event: Event) {
    const textBox = event.target as HTMLInputElement;
    window.settings.set(textBox.name, textBox.value);
  }

  private rebuildIndex() {
    taskQueue.push(
      {
        type: "cask-reindex-all",
        label: "Rebuild catalog",
        condition: "always",
        wipeIndexFirst: true,
      } as CaskReindexAllTask,
      ["before", "after"]
    );
  }
}
