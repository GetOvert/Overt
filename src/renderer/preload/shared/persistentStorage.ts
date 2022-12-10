import { ipcRenderer } from "electron";
import { IPCPersistentStorage } from "ipc/IPCPersistentStorage";

const persistentStorage: IPCPersistentStorage = {
  get(key) {
    return ipcRenderer.invoke("persistent-storage.get", key);
  },

  set(key, value) {
    return ipcRenderer.invoke("persistent-storage.set", key, value);
  },
};

export default persistentStorage;
