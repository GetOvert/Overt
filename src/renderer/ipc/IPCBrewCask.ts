declare global {
  interface Window {
    brewCask: IPCBrewCask;
  }
}

export interface IPCBrewCask {
  addIndexListener(listener: () => void): void;
  rebuildIndex(condition: "always" | "if-nonexistent"): Promise<void>;
  updateIndex(caskNames: string[]): Promise<void>;

  search(
    searchString: string,
    sortBy: SortKey,
    filterBy: FilterKey,
    limit: number,
    offset: number
  ): object[];
  info(caskName: string): object;

  install(caskName: string): Promise<boolean>;
  upgrade(caskName: string): Promise<boolean>;
  uninstall(caskName: string): Promise<boolean>;
}

export type SortKey =
  | "installed-30d"
  | "installed-90d"
  | "installed-365d"
  | "updated"
  | "added";
export type FilterKey = "available" | "installed";
