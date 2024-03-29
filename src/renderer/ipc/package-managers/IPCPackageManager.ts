export interface IPCPackageManager<PackageInfo, SortKey> {
  readonly name: string;
  readonly supportsZapUninstall?: boolean;

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
  uninstall(packageName: string, options?: { zap?: boolean }): Promise<boolean>;

  indexSourceRepositories(): Promise<void>;
  addSourceRepository(name: string, url: string): Promise<boolean>;
  removeSourceRepository(name: string): Promise<boolean>;

  launchables(packageInfo: PackageInfo): Promise<Launchable[]>;

  // Allow extra properties in the implementation, which is an object
  // instead of a class because only objects bridge properly
  [etc: string | number | symbol]: unknown;
}

export type FilterKey = "all" | "available" | "installed" | "updates";

export type Launchable = {
  path: string;
  label: string;
};
