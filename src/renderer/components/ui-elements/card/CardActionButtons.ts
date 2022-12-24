import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import { html, HTMLTemplateResult, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";

export type CardAction = {
  tooltip: string;
  icon: HTMLTemplateResult;
  color: string;

  shown: boolean;

  enabled: boolean;
  loading?: boolean;

  run: () => void;
};

@customElement("overt-card-action-buttons")
export default class CardActionButtons extends BootstrapBlockElement {
  @property({ type: Array })
  actions: CardAction[];

  protected updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    this.addPopperTooltips();
  }

  protected render() {
    return html`
      <div
        role="group"
        class="btn-group-vertical bg-light rounded my-2 me-2 me-lg-3"
        style="gap: 0.25rem; margin-left: -3rem"
        @click=${(event: Event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        ${this.actions
          .filter(({ shown }) => shown)
          .map(
            ({ tooltip, icon, color, run, enabled, loading }) => html`
              <button
                class="btn btn-outline-${color} border-0"
                data-bs-toggle="tooltip"
                data-bs-placement="left"
                title=${tooltip}
                ?disabled=${!enabled}
                @click=${run}
              >
                ${loading
                  ? html`<span
                      class="spinner-border spinner-border-sm"
                      role="status"
                    ></span>`
                  : icon}
              </button>
            `
          )}
      </div>
    `;
  }
}
