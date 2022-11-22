import { ipcRenderer } from "electron";
import { IPCLifecycle } from "ipc/IPCLifecycle";

export default {
  relaunch(): void {
    ipcRenderer.send("relaunch");
  },
} as IPCLifecycle;
