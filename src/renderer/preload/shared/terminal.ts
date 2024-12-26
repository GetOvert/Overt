import { ipcRenderer, IpcRendererEvent } from "electron";
import { IPCTerminal } from "ipc/IPCTerminal";

const callbackShims: Map<number, (e: IpcRendererEvent, data: string) => void> =
  new Map();
let nextCallbackID = 1;

export default {
  send(data) {
    ipcRenderer.send("terminal.send", data);
  },

  onReceive(callback: (data: string) => void): number {
    const shim = (e: IpcRendererEvent, data: string) => {
      callback(data);
    };

    ipcRenderer.on("terminal.receive", shim);

    callbackShims.set(nextCallbackID, shim);
    return nextCallbackID++;
  },

  offReceive(callbackID: number): void {
    const shim = callbackShims.get(callbackID);
    if (!shim) return;

    ipcRenderer.off("terminal.receive", shim);
    callbackShims.delete(callbackID);
  },
} as IPCTerminal;
