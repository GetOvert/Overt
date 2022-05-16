import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import "components/card/Card";
import "components/grid/grid";
import { CaskReindexAllTask, QueuedTask } from "components/tasks/model/Task";
import taskQueue, { TaskQueueObserver } from "components/tasks/model/TaskQueue";
import {
  FilterKey,
  IPCPackageManager,
} from "ipc/package-managers/IPCPackageManager";
import { SortKey } from "ipc/package-managers/macOS/IPCBrewCask";
import { css, html, HTMLTemplateResult, render } from "lit";
import { asyncAppend } from "lit-html/directives/async-append.js";
import { customElement, property, state } from "lit/decorators.js";
import { Ref, createRef, ref } from "lit/directives/ref.js";
import { repeat } from "lit/directives/repeat.js";
import { packageManagerForName } from "package-manager/PackageManagerRegistry";

const fetchedChunkSize = 25;
let lastOffset = 0;

let lastScrollY = 0;

@customElement("openstore-apps-view")
export default class AppsView<
  PackageManager extends IPCPackageManager<PackageInfo, SortKey>,
  PackageInfo,
  SortKey
> extends BootstrapBlockElement {
  @property()
  packageManager: PackageManager;

  @property({ type: Number, reflect: true })
  offset = 0;

  @state()
  private _appGenerators: AsyncGenerator<PackageInfo>[] = [];
  @state()
  private _loadedCount = 0;
  @state()
  private _canLoadMore = true;

  private _scrollContainerRef: Ref<HTMLElement> = createRef();
  get _scrollContainer(): HTMLElement {
    return this._scrollContainerRef.value;
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
  }

  private taskQueueChanged(updatedTask: QueuedTask) {
    if (
      updatedTask.state === "succeeded" &&
      ["cask-reindex-all", "cask-reindex-outdated", "cask-reindex"].includes(
        updatedTask.type
      )
    ) {
      this._reset();
      this._loadApps(lastOffset + fetchedChunkSize);
    }

    if (
      updatedTask.state === "running" &&
      updatedTask.type === "cask-reindex-all" &&
      (updatedTask as CaskReindexAllTask).wipeIndexFirst
    ) {
      this._reset();
    }
  }

  private get _currentlyIndexing(): boolean {
    return !!taskQueue.liveTasks.find(
      (task) =>
        task.type === "cask-reindex-all" &&
        ((task as CaskReindexAllTask).wipeIndexFirst || this._loadedCount === 0)
    );
  }

  private _reset() {
    this._appGenerators = [];
    this._loadedCount = 0;
    this._canLoadMore = true;
  }

  private _loadApps(limit: number) {
    const routeParams = ((window as any).openStore as any).decodeFragment(
      window.location.hash
    );
    this._appGenerators.push(
      this.provideAppsAsGenerator(
        routeParams.search ?? "",
        routeParams.sort ?? "installed-30d",
        routeParams.filter ?? "all",
        limit,
        this.offset,
        (result) => {
          this._loadedCount += result.length;
          this._canLoadMore = result.length === limit;
          window.setTimeout(() => {
            this._scrollContainer.scrollTo({ top: lastScrollY });
          }, 0);
        }
      )
    );
    this.requestUpdate();
  }

  protected firstUpdated(
    changedProperties: Map<string | number | symbol, unknown>
  ): void {
    this._scrollContainer.addEventListener(
      "scroll",
      () => {
        lastScrollY = this._scrollContainer.scrollTop;
      },
      { passive: true }
    );
  }

  protected updated(
    changedProperties: Map<string | number | symbol, unknown>
  ): void {
    if (changedProperties.has("offset")) {
      this._scrollContainer.scrollTo({ top: lastScrollY });
    }
  }

  loadMoreApps() {
    lastOffset += fetchedChunkSize;
    this.offset = lastOffset;

    this._loadApps(fetchedChunkSize);
  }

  private async *provideAppsAsGenerator(
    searchString: string,
    sortBy: SortKey,
    filterBy: FilterKey,
    limit: number,
    offset: number,
    completedCallback: (result: PackageInfo[]) => void
  ): AsyncGenerator<PackageInfo, void, undefined> {
    const result = await this.packageManager.search(
      searchString,
      sortBy,
      filterBy,
      limit,
      offset
    );
    completedCallback(result);
    yield* result;
  }

  static styles = [
    BootstrapBlockElement.styles,
    css`
      .loading-letter {
        animation: loading-letter 2s ease-out infinite;
      }

      @keyframes loading-letter {
        7% {
          opacity: 60%;
        }

        35% {
          opacity: 100%;
        }
      }
    `,
  ];

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

      <div
        ${ref(this._scrollContainerRef)}
        class="position-fixed overflow-scroll pe-2"
        style="
          top: 56px;
          right: 0;
          width: 75vw;
          height: calc(100vh - 56px);
        "
      >
        <div
          class="text-center position-absolute top-50 start-50 translate-middle pb-5 ${this
            ._currentlyIndexing
            ? ""
            : "d-none"}"
        >
          <div
            class="spinner-border border-5 text-primary"
            style="width: 2.5rem; height: 2.5rem;"
            role="status"
          ></div>
          <h1 class="h3 fw-bold mt-3">
            ${this.animatedLoadingText("Building catalog…")}
          </h1>
          <p class="text-muted fst-italic fw-normal mt-3">
            This may take a minute or two
          </p>
        </div>

        <div
          class="text-center position-absolute top-50 start-50 translate-middle pb-5 ${!this
            ._currentlyIndexing && this._loadedCount === 0
            ? ""
            : "d-none"}"
        >
          <h1 class="h3 text-muted mt-3">No results</h1>
        </div>

        <openstore-grid
          class="${!this._currentlyIndexing && this._loadedCount !== 0
            ? ""
            : "d-none"}"
        >
          <openstore-row>
            ${repeat(this._appGenerators, (appGenerator) =>
              asyncAppend(appGenerator, (app: any) => {
                const installed = !!app.installed;
                const outdated =
                  !app.auto_updates && app.installed !== app.version;

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
                      .href=${((window as any).openStore as any).encodeFragment(
                        {
                          subpage: app.full_token,
                        }
                      )}
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
                            enabled:
                              app.installed !== null &&
                              !app.auto_updates &&
                              app.installed !== app.version,
                            callback: "cask-upgrade",
                            args: [app.full_token, app.name[0]],
                          },
                          {
                            label: "Uninstall",
                            enabled: app.installed !== null,
                            callback: "cask-uninstall",
                            args: [app.full_token, app.name[0]],
                          },
                          {
                            type: "separator",
                          },
                          {
                            label: "Reindex",
                            callback: "cask-reindex",
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
                      : "d-none"} btn btn-primary mt-3 mb-5"
                    @click=${this.loadMoreApps}
                  >
                    Load More
                  </button>
                `
              : html`
                  <div class="h4 text-center text-muted mt-3 mb-5">
                    Nothing more to load
                  </div>
                `}
          </openstore-row>
        </openstore-grid>
      </div>
    `;
  }

  private animatedLoadingText(text: string): HTMLTemplateResult {
    return html`<span class="visually-hidden">${text}</span>${text
        .split(/(?=.)/)
        .filter((s) => s)
        .map(
          (s, index) =>
            html`<span
              aria-hidden="true"
              class="loading-letter"
              style="animation-delay: ${index * 0.05}s"
              >${s}</span
            >`
        )} `;
  }
}

(window as any).openStore.pages["apps"] = {
  title: "",
  
  _currentPackageManager: null,

  async onNavigatedTo(content: HTMLElement) {
    this._currentPackageManager = packageManagerForName(
      (window as any).openStore.decodeFragment(window.location.hash).source
    );
    
    render(
      html`<openstore-apps-view
        .packageManager=${this._currentPackageManager}
      ></openstore-apps-view>`,
      content
    );
  },
  async getSubpage(appIdentifier: string): Promise<any> {
    const app = (await this._currentPackageManager.info(appIdentifier)) as any;

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
