export interface IPCPackageManager<PackageInfo, SortKey> {
  readonly name: string;

  addIndexListener(listener: () => void): void;
  rebuildIndex(
    condition: "always" | "if-too-old" | "if-nonexistent",
    wipeIndexFirst?: boolean
  ): Promise<void>;
  indexAll(): Promise<void>;
  indexOutdated(): Promise<void>;
  indexSpecific(packageNames?: string[]): Promise<void>;

  search(
    searchString: string,
    sortBy: SortKey,
    filterBy: FilterKey,
    limit: number,
    offset: number
  ): PackageInfo[];
  info(packageName: string): PackageInfo | null;

  install(packageName: string): Promise<boolean>;
  upgrade(packageName: string): Promise<boolean>;
  uninstall(packageName: string): Promise<boolean>;

  indexSourceRepositories(): Promise<void>;
  addSourceRepository(name: string, url: string): Promise<boolean>;
  removeSourceRepository(name: string): Promise<boolean>;

  // Allow extra properties in the implementation, which is an object
  // instead of a class because only objects bridge properly
  [etc: string | number | symbol]: unknown;
}

export type FilterKey = "all" | "available" | "installed" | "updates";
