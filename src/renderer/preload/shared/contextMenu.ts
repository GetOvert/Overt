import {
  ipcRenderer,
  IpcRendererEvent,
  MenuItemConstructorOptions,
} from "electron";
import { IPCContextMenu } from "ipc/IPCContextMenu";

export default {
  async set(
    items: (MenuItemConstructorOptions &
      ({ callback: string; args: any[] } | { type: "separator" }))[]
  ) {
    await ipcRenderer.invoke("contextmenu.set", items);
  },
  async setCallback(key: string, callback: (...args: any) => Promise<void>) {
    ipcRenderer.on(
      `contextmenu.callback.${key}`,
      (event: IpcRendererEvent, ...args: any[]) => callback(...args)
    );
  },
} as IPCContextMenu;
