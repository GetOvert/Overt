import cloneDeep from "clone-deep";
import BootstrapBlockElement from "components/abstract/BootstrapBlockElement";
import "components/ui-elements/card/Card";
import "components/grid/bootstrap-grid";
import "components/grid/css-grid";
import { QueuedTask, ReindexAllTask } from "tasks/Task";
import taskQueue, { TaskQueueObserver } from "tasks/TaskQueue";
import {
  FilterKey,
  IPCPackageManager,
} from "ipc/package-managers/IPCPackageManager";
import { css, html, HTMLTemplateResult, PropertyValues, render } from "lit";
import { asyncAppend } from "lit-html/directives/async-append.js";
import { customElement, property, state } from "lit/decorators.js";
import { Ref, createRef, ref } from "lit/directives/ref.js";
import { repeat } from "lit/directives/repeat.js";
import { PackageInfoAdapter } from "package-manager/PackageInfoAdapter";
import {
  packageInfoAdapterForPackageManagerName,
  packageManagerForName,
} from "package-manager/PackageManagerRegistry";

const fetchedChunkSize = 25;
let lastOffset = 0;

let lastScrollY = 0;
let lastRouteParams: any = {};

@customElement("openstore-packages-view")
export default class AppsView<
  PackageManager extends IPCPackageManager<PackageInfo, SortKey>,
  PackageInfo,
  SortKey
> extends BootstrapBlockElement {
  @property()
  packageManager: PackageManager;
  @property()
  packageInfoAdapter: PackageInfoAdapter<PackageInfo>;

  @property({ type: Number, reflect: true })
  offset = 0;

  @state()
  private _appGenerators: AsyncGenerator<PackageInfo>[] = [];
  @state()
  private _loadedCount = 0;
  @state()
  private _batchNumber = 0;
  @state()
  private _canLoadMore = true;

  private _scrollContainerRef: Ref<HTMLElement> = createRef();
  get _scrollContainer(): HTMLElement {
    return this._scrollContainerRef.value!;
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
      ["reindex-all", "reindex-outdated", "reindex"].includes(
        updatedTask.task.type
      )
    ) {
      this._reset();
      this._loadApps(lastOffset + fetchedChunkSize);
    }

    if (
      updatedTask.state === "running" &&
      updatedTask.task.type === "reindex-all" &&
      (updatedTask as unknown as ReindexAllTask).wipeIndexFirst
    ) {
      this._reset();
    }
  }

  private get _currentlyIndexing(): boolean {
    return !!taskQueue.liveTasks.find(
      ({ task }) =>
        task.type === "reindex-all" &&
        ((task as unknown as ReindexAllTask).wipeIndexFirst ||
          this._loadedCount === 0)
    );
  }

  private _reset() {
    this._appGenerators = [];
    this._loadedCount = 0;
    this._batchNumber = 0;
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
          this._batchNumber += 1;
          this._canLoadMore = result.length === limit;

          window.setTimeout(() => {
            if (
              routeParams.source === lastRouteParams.source &&
              routeParams.search === lastRouteParams.search &&
              routeParams.sort === lastRouteParams.sort &&
              routeParams.filter === lastRouteParams.filter
            ) {
              this._scrollContainer.scrollTo({ top: lastScrollY });
            } else {
              this._scrollContainer.scrollTo({ top: 0 });
            }
            this.focusFirstCardInBatch();

            lastRouteParams = cloneDeep(routeParams);
          }, 0);
        }
      )
    );

    this.requestUpdate();
  }

  private focusFirstCardInBatch(): void {
    if (this._batchNumber === 1) return;

    const card = this.renderRoot?.querySelector<HTMLElement>(
      `openstore-card.batch-${this._batchNumber}`
    );
    card?.focus({ preventScroll: true });
  }

  protected firstUpdated(changedProperties: PropertyValues<this>): void {
    this._scrollContainer.addEventListener(
      "scroll",
      () => {
        lastScrollY = this._scrollContainer.scrollTop;
      },
      { passive: true }
    );
  }

  protected updated(changedProperties: PropertyValues<this>): void {
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
    const result = this.packageManager.search(
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
          <openstore-css-grid>
            ${repeat(this._appGenerators, (appGenerator) =>
              asyncAppend(appGenerator, (packageInfo: PackageInfo) => {
                const name = this.packageInfoAdapter.packageName(packageInfo);
                const identifier =
                  this.packageInfoAdapter.packageIdentifier(packageInfo);
                const description =
                  this.packageInfoAdapter.packageDescription(packageInfo);
                const isInstalled =
                  this.packageInfoAdapter.isPackageInstalled(packageInfo);
                const isOutdated =
                  this.packageInfoAdapter.isPackageOutdated(packageInfo);

                return html`
                  <openstore-col class="mx-2">
                    <openstore-card
                      class=${`batch-${this._batchNumber}`}
                      .title=${name}
                      .subtitle=${identifier !== name ? identifier : ""}
                      .status=${isInstalled
                        ? isOutdated
                          ? "update available"
                          : "installed"
                        : "not installed"}
                      .statusColor=${isInstalled
                        ? isOutdated
                          ? "info"
                          : "success"
                        : "muted"}
                      .details=${description}
                      .href=${((window as any).openStore as any).encodeFragment(
                        {
                          subpage: identifier,
                        }
                      )}
                      @contextmenu=${() =>
                        window.contextMenu.set([
                          {
                            label: "Install",
                            enabled: !isInstalled,
                            callback: "install",
                            args: [this.packageManager.name, identifier, name],
                          },
                          {
                            label: "Update",
                            enabled: isInstalled && isOutdated,
                            callback: "upgrade",
                            args: [this.packageManager.name, identifier, name],
                          },
                          {
                            label: "Uninstall",
                            enabled: isInstalled,
                            callback: "uninstall",
                            args: [this.packageManager.name, identifier, name],
                          },
                          {
                            type: "separator",
                          },
                          {
                            label: "Reindex",
                            callback: "reindex",
                            args: [this.packageManager.name, identifier, name],
                          },
                        ])}
                    ></openstore-card>
                  </openstore-col>
                `;
              })
            )}
          </openstore-css-grid>
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
  _currentPackageInfoAdapter: null,

  async onNavigatedTo(content: HTMLElement) {
    const packageManagerName = (window as any).openStore.decodeFragment(
      window.location.hash
    ).source;
    this._currentPackageManager = packageManagerForName(packageManagerName);
    this._currentPackageInfoAdapter =
      packageInfoAdapterForPackageManagerName(packageManagerName);

    render(
      html`<openstore-packages-view
        .packageManager=${this._currentPackageManager}
        .packageInfoAdapter=${this._currentPackageInfoAdapter}
      ></openstore-packages-view>`,
      content
    );
  },
  async getSubpage(packageIdentifier: string): Promise<any> {
    const packageInfo = this._currentPackageManager.info(packageIdentifier);

    return {
      title: this._currentPackageInfoAdapter.packageName(packageInfo),
      isSubpage: true,

      async onNavigatedTo(content: HTMLElement) {
        const container = document.createDocumentFragment();
        render(
          html`<openstore-package-detail-view
            .packageInfo=${packageInfo}
          ></openstore-package-detail-view>`,
          container
        );
        content.append(...container.children);
      },
    };
  },
};
