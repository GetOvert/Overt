import { contextBridge } from "electron";
import scoop from "./scoop";
import winget from "./winget";

if (process.platform === "win32") {
  contextBridge.exposeInMainWorld("scoop", scoop);
  contextBridge.exposeInMainWorld("winget", winget);
}
