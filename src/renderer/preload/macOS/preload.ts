import { contextBridge } from "electron";
import brewCask from "./brewCask";

if (process.platform === "darwin") {
  contextBridge.exposeInMainWorld("brewCask", brewCask);
}
