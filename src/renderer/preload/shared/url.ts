import { ipcRenderer, IpcRendererEvent } from "electron";
import { IPCURL } from "ipc/IPCURL";

export default {
  setHandler(handler: (url: string) => void) {
    ipcRenderer.on("handle_url", (event: IpcRendererEvent, url: string) =>
      handler(url)
    );
  },
} as IPCURL;
