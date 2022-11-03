import { ipcRenderer } from "electron";
import { IPCSettings } from "ipc/IPCSettings";

const settings: IPCSettings = {
  get(key) {
    return ipcRenderer.invoke("settings.get", key);
  },

  set(key, value) {
    return ipcRenderer.invoke("settings.set", key, value);
  },

  onChange(keys, callback) {
    for (const key of keys) {
      ipcRenderer.on(`settings.${key}.change`, () => {
        callback();
      });
    }
  },
};

export default settings;
