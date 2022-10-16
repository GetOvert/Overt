import { contextBridge } from "electron";
import winget from "./winget";

if (process.platform === "win32") {
  contextBridge.exposeInMainWorld("winget", winget);
}
