import { ipcRenderer } from "electron";
import { IPCSettings } from "ipc/IPCSettings";

export default {
  set(key, value) {
    return ipcRenderer.invoke("settings.set", key, value);
  },

  get(key) {
    return ipcRenderer.invoke("settings.get", key);
  },
} as IPCSettings;
