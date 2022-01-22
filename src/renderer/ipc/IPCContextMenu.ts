import { MenuItemConstructorOptions } from "electron";

declare global {
  interface Window {
    contextMenu: IPCContextMenu;
  }
}

export interface IPCContextMenu {
  set(
    items: (MenuItemConstructorOptions & { callback: string; args: any[] })[]
  ): Promise<void>;
  setCallback(
    key: string,
    callback: (...args: any) => Promise<void>
  ): Promise<void>;
}
