import { ipcRenderer, shell } from "electron";
import { css, html, PropertyValues } from "lit";
import { customElement, state } from "lit/decorators.js";
import { BootstrapBlockElement } from "setup/main-window-imports";
import { packageManagerSetups } from "setup/package-managers/package-managers";
import { PackageManagerSetup } from "setup/package-managers/PackageManagerSetup";
import { Config, PackageManagersConfig } from "shared/config";
import { join } from "lit/directives/join.js";

@customElement("overt-setup-main")
export default class SetupMain extends BootstrapBlockElement {
  @state()
  homebrewPath?: string;

  @state()
  fieldFocus = new Set<keyof PackageManagersConfig>();

  protected async firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    await this.fetchSettingsValues();
    await Promise.all(
      packageManagerSetups.map((setup) => this.locateIfUnset(setup))
    );
  }

  protected updated(changedProperties: PropertyValues<this>) {
    super.updated(changedProperties);
    this.addPopperTooltips();
    this.fetchSettingsValues();
  }

  private async fetchSettingsValues() {
    const keys: (keyof this & keyof PackageManagersConfig)[] =
      packageManagerSetups.map(({ key }) => key);

    const valueEntries = await Promise.all(
      keys.map(async (key) => [
        key,
        await ipcRenderer.invoke("settings.get", key),
      ])
    );

    Object.assign(this, Object.fromEntries(valueEntries));
  }

  private async setSettingsValue(key: keyof Config, value: any) {
    await ipcRenderer.invoke("settings.set", key, value);
    await this.fetchSettingsValues();
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
        -webkit-user-drag: none;
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

      label:not(:last-child) {
        margin-bottom: 1rem;
      }
    `,
  ];

  render() {
    const valid = this.validPackageManagers();

    return html`
      <h2 class="text-center border-bottom mb-3 pb-2">Welcome to Overt</h2>

      <p>
        To deliver an extensive and robust software catalog, Overt relies on
        external programs called <i>package managers</i>.
        ${this.renderExternalLink(
          "https://getovert.app/about#technical",
          "More info here"
        )}
      </p>

      <p>
        Overt found
        <strong>${valid.length || "no"}</strong> package
        manager${valid.length === 1 ? "" : "s"} on your
        system${valid.length ? ": " : ""}${join(
          valid.map(({ label }) => html`<strong>${label}</strong>`),
          ", "
        )}.
      </p>

      <p>
        To install a new package manager, click
        <span class="text-bg-primary px-2 py-1 rounded fs-5 text-uppercase"
          >Install</span
        >.
      </p>

      <div class="d-flex flex-column my-2">
        <h3>Package Managers</h3>

        ${packageManagerSetups.map((setup) =>
          this.renderPackageManagerSetup(setup)
        )}
      </div>

      <div class="d-flex justify-content-end mt-5">
        <button
          type="submit"
          href="#"
          class="btn btn-primary px-4"
          ?disabled=${!valid.length || this.fieldFocus.size}
          @click=${this.submit}
        >
          Finish
        </button>
      </div>
      <p class="text-end mt-2">
        <small
          >You can return here later from Settings → Advanced → Set Up Package
          Managers</small
        >
      </p>
    `;
  }

  private renderExternalLink(url: string, label: string) {
    return html`
      <a href=${url} @click=${this.openExternalLink}>
        ${label}

        <!-- https://icons.getbootstrap.com/icons/box-arrow-up-right/ -->
        <svg
          aria-label="External link"
          style="transform: scale(0.8) translateY(-3px)"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          class="bi bi-box-arrow-up-right"
          viewBox="0 0 16 16"
        >
          <path
            fill-rule="evenodd"
            d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"
          />
          <path
            fill-rule="evenodd"
            d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"
          />
        </svg>
      </a>
    `;
  }

  private renderPackageManagerSetup(setup: PackageManagerSetup) {
    return html`
      <label>
        <div class="mt-1 mb-2">
          ${setup.label} &ndash;
          ${this.renderExternalLink(setup.officialURL, setup.officialURL)}
        </div>

        <div class="input-group mt-1">
          <input
            type="text"
            class="form-control form-control-sm"
            placeholder="/path/to/installation"
            name=${setup.key}
            .value=${this[setup.key]}
            @change=${this.onTextFieldChanged}
            @focus=${() => {
              this.fieldFocus.add(setup.key);
              this.requestUpdate();
            }}
            @blur=${() => {
              this.fieldFocus.delete(setup.key);
              this.requestUpdate();
            }}
          />

          <button
            type="button"
            class="btn btn-sm btn-light border"
            @click=${() => this.locateOrPromptToInstall(setup)}
            data-bs-toggle="tooltip"
            data-bs-custom-class="tooltip-wide"
            title="Try to find ${setup.label} again"
          >
            Find
          </button>
          <button
            type="button"
            class="btn btn-sm btn-light border"
            @click=${() => this.about(setup)}
            data-bs-toggle="tooltip"
            data-bs-custom-class="tooltip-wide"
            title="Learn about ${setup.label}"
          >
            About
          </button>
          <button
            type="button"
            class="btn btn-sm btn-primary"
            @click=${() => this.install(setup)}
            data-bs-toggle="tooltip"
            data-bs-custom-class="tooltip-wide"
            title="Install ${setup.label}"
          >
            Install
          </button>
        </div>
      </label>
    `;
  }

  private onTextFieldChanged(event: Event) {
    const textField = event.target as HTMLInputElement;
    this.setSettingsValue(
      textField.name as keyof PackageManagersConfig,
      textField.value
    );
  }

  private openExternalLink(event: Event) {
    event.preventDefault();
    shell.openExternal((event.target as HTMLElement).closest("a")!.href);
  }

  private async submit(event: Event) {
    event.preventDefault();

    await this.setSettingsValue("showSetupOnNextLaunch", false);
    await this.setSettingsValue("indexOnNextLaunch", true);

    ipcRenderer.send("relaunch");
  }

  private validPackageManagers(): PackageManagerSetup[] {
    return packageManagerSetups.filter((setup) => this.isValid(setup));
  }

  private isValid(setup: PackageManagerSetup): boolean {
    const path = this[setup.key];
    return !!path && setup.isValid(path);
  }

  private async locateIfUnset(setup: PackageManagerSetup) {
    if (!this[setup.key]) await this.locate(setup);
  }

  private async locate(setup: PackageManagerSetup) {
    const path = await setup.locate();
    if (path) await this.setSettingsValue(setup.key, path);
  }

  private async locateOrPromptToInstall(setup: PackageManagerSetup) {
    await this.locate(setup);
    const path = this[setup.key];
    if (path && setup.isValid(path)) return;

    const install = window.confirm(
      `${setup.label} could not be found. Would you like to install it?`
    );
    if (install) this.install(setup);
  }

  private async about(setup: PackageManagerSetup) {
    await shell.openExternal(setup.aboutURL);
  }

  private async install(setup: PackageManagerSetup) {
    await shell.openExternal(setup.installURL);
  }
}
