import { FilterKey, SortKey } from "ipc/IPCBrewCask";

let indexBuilt = true; // TEMPORARY
let indexBeingBuilt = false;

export async function searchApps(
  searchString: string,
  sortBy: SortKey,
  filterBy: FilterKey,
  limit: number,
  offset: number
): Promise<object[]> {
  return window.brewCask.search(searchString, sortBy, filterBy, limit, offset);
}

export function getAppInfo(caskName: string): object {
  return window.brewCask.info(caskName);
}
