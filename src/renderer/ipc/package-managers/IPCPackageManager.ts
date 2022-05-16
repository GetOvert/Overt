export interface IPCPackageManager<PackageInfo, SortKey> {
  addIndexListener(listener: () => void): void;
  rebuildIndex(
    condition: "always" | "if-too-old" | "if-nonexistent",
    wipeIndexFirst?: boolean
  ): Promise<void>;
  reindexOutdated(): Promise<void>;
  updateIndex(packageNames?: string[]): Promise<void>;

  search(
    searchString: string,
    sortBy: SortKey,
    filterBy: FilterKey,
    limit: number,
    offset: number
  ): Promise<PackageInfo[]>;
  info(packageName: string): Promise<PackageInfo>;

  install(packageName: string): Promise<boolean>;
  upgrade(packageName: string): Promise<boolean>;
  uninstall(packageName: string): Promise<boolean>;
}

export type FilterKey = "all" | "available" | "installed" | "updates";
