import { contextBridge } from "electron";
import brewCask from "./brewCask";
import brew from "./brew";

if (process.platform === "darwin") {
  contextBridge.exposeInMainWorld("brewCask", brewCask);
  contextBridge.exposeInMainWorld("brew", brew);
}
