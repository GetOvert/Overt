import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import "components/card/Card";
import "components/grid/grid";
import { Grid } from "components/grid/grid";
import { QueuedTask } from "components/tasks/model/Task";
import taskQueue, { TaskQueueObserver } from "components/tasks/model/TaskQueue";
import { FilterKey, SortKey } from "ipc/IPCBrewCask";
import { html, render } from "lit";
import { asyncAppend } from "lit-html/directives/async-append.js";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { getAppInfo, searchApps } from "./apps";

async function* provideAppsAsGenerator(
  searchString: string,
  sortBy: SortKey,
  filterBy: FilterKey,
  limit: number,
  offset: number,
  completedCallback: (result: object[]) => void
) {
  const result = await searchApps(
    searchString,
    sortBy,
    filterBy,
    limit,
    offset
  );
  completedCallback(result);
  yield* result;
}

const fetchedChunkSize = 25;
let lastOffset = 0;

let lastScrollY = 0;

@customElement("openstore-apps-view")
export default class AppsView extends BootstrapBlockElement {
  @property({ type: Number, reflect: true })
  offset = 0;

  @state()
  private _appGenerators: AsyncGenerator<object>[] = [];
  @state()
  private _canLoadMore = true;

  private _lastFragment: string = window.location.hash;

  get grid(): Grid {
    return this.renderRoot.querySelector("openstore-grid");
  }

  constructor() {
    super();

    this._loadApps(lastOffset + fetchedChunkSize);
  }

  private taskQueueObserver: TaskQueueObserver;

  connectedCallback(): void {
    super.connectedCallback();

    this.taskQueueObserver = this.taskQueueChanged.bind(this);
    taskQueue.addObserver(this.taskQueueObserver);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();

    taskQueue.removeObserver(this.taskQueueObserver);

    this._lastFragment = window.location.hash;
  }

  private taskQueueChanged(updatedTask: QueuedTask) {
    if (
      updatedTask.state === "succeeded" &&
      ["cask-reindex-all", "cask-reindex"].includes(updatedTask.type)
    ) {
      this._appGenerators = [];
      this._loadApps(lastOffset + fetchedChunkSize);
    }
  }

  private _loadApps(limit: number) {
    const routeParams = ((window as any).openStore as any).decodeFragment(
      window.location.hash
    );
    this._appGenerators.push(
      provideAppsAsGenerator(
        routeParams.search ?? "",
        routeParams.sort ?? "installed-30d",
        routeParams.filter ?? "available",
        limit,
        this.offset,
        (result) => {
          this._canLoadMore = result.length === fetchedChunkSize;
          window.setTimeout(() => {
            this.grid.scrollTo({ top: lastScrollY });
          }, 0);
        }
      )
    );
    this.requestUpdate();
  }

  protected firstUpdated(
    changedProperties: Map<string | number | symbol, unknown>
  ): void {
    this.grid.addEventListener(
      "scroll",
      () => {
        lastScrollY = this.grid.scrollTop;
      },
      { passive: true }
    );
  }

  protected updated(
    changedProperties: Map<string | number | symbol, unknown>
  ): void {
    if (changedProperties.has("offset")) {
      this.grid.scrollTo({ top: lastScrollY });
    }
  }

  render() {
    return html`
      ${BootstrapBlockElement.styleLink}

      <openstore-sidebar
        class="position-fixed px-3"
        style="
          top: 56px;
          left: 0;
          width: 25vw;
          height: calc(100vh - 56px);
          "
      >
      </openstore-sidebar>

      <openstore-grid
        class="position-fixed overflow-scroll pe-2"
        style="
          top: 56px;
          right: 0;
          width: 75vw;
          height: calc(100vh - 56px);
        "
      >
        <openstore-row>
          ${repeat(this._appGenerators, (appGenerator) =>
            asyncAppend(appGenerator, (app: any) => {
              const installed = !!app.installed;
              const outdated = app.installed !== app.version;

              return html`
                <openstore-col class="mx-2">
                  <openstore-card
                    .title=${app.name[0]}
                    .subtitle=${app.full_token}
                    .status=${installed
                      ? outdated
                        ? "update available"
                        : "installed"
                      : "not installed"}
                    .statusColor=${installed
                      ? outdated
                        ? "info"
                        : "success"
                      : "muted"}
                    .details=${app.desc}
                    .href=${((window as any).openStore as any).encodeFragment({
                      subpage: app.full_token,
                    })}
                    @contextmenu=${() =>
                      window.contextMenu.set([
                        {
                          label: "Install",
                          enabled: app.installed === null,
                          callback: "cask-install",
                          args: [app.full_token, app.name[0]],
                        },
                        {
                          label: "Update",
                          enabled: app.installed !== null && !app.auto_updates,
                          callback: "cask-upgrade",
                          args: [app.full_token, app.name[0]],
                        },
                        {
                          label: "Uninstall",
                          enabled: app.installed !== null,
                          callback: "cask-uninstall",
                          args: [app.full_token, app.name[0]],
                        },
                      ])}
                  ></openstore-card>
                </openstore-col>
              `;
            })
          )}
        </openstore-row>
        <openstore-row>
          ${this._canLoadMore
            ? html`
                <button
                  class="${this._canLoadMore
                    ? ""
                    : "d-none"} btn btn-primary mt-2 mb-4"
                  @click=${this.loadMoreApps}
                >
                  Load More
                </button>
              `
            : html`
                <div class="text-center text-muted fst-italic mt-2 mb-4">
                  Nothing more to load
                </div>
              `}
        </openstore-row>
      </openstore-grid>
    `;
  }

  loadMoreApps() {
    this.offset += fetchedChunkSize;
    lastOffset = this.offset;

    this._loadApps(fetchedChunkSize);
  }
}

(window as any).openStore.pages["brew-cask"] = {
  title: "",

  async onNavigatedTo(content: HTMLElement) {
    render(html`<openstore-apps-view></openstore-apps-view>`, content);
  },
  async getSubpage(appIdentifier: string): Promise<any> {
    const app = getAppInfo(appIdentifier) as any;

    return {
      title: app.name[0],
      isSubpage: true,

      async onNavigatedTo(content) {
        const container = document.createDocumentFragment();
        render(
          html`<openstore-app-view .app=${app}></openstore-app-view>`,
          container
        );
        content.append(...container.children);
      },
    };
  },
};
