import { contextBridge, ipcRenderer } from "electron";
import contextMenu from "./contextMenu";
import openExternalLink from "./openExternalLink";
import openProduct from "./openProduct";
import platform from "./platform";
import settings from "./settings";
import taskQueueIPC from "./taskQueueIPC";
import terminal from "./terminal";
import theme from "./theme";
import "./macOS/preload";
import "./Windows/preload";

contextBridge.exposeInMainWorld("contextMenu", contextMenu);
contextBridge.exposeInMainWorld("openExternalLink", openExternalLink);
contextBridge.exposeInMainWorld("openProduct", openProduct);
contextBridge.exposeInMainWorld("platform", platform);
contextBridge.exposeInMainWorld("settings", settings);
contextBridge.exposeInMainWorld("taskQueueIPC", taskQueueIPC);
contextBridge.exposeInMainWorld("terminal", terminal);
contextBridge.exposeInMainWorld("theme", theme);

// TODO: Move to search bar component (once the search bar has been converted to a component)
ipcRenderer.on("focus_search_bar", () => {
  const searchBar = document.querySelector("#search-bar") as HTMLInputElement;
  searchBar.focus();
  searchBar.select();
});
