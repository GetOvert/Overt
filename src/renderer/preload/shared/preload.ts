import { contextBridge, ipcRenderer } from "electron";
import contextMenu from "./contextMenu";
import lifecycle from "./lifecycle";
import openExternalLink from "./openExternalLink";
import openProduct from "./openProduct";
import platform from "./platform";
import settings from "./settings";
import sourceRepositories from "./sourceRepositories";
import taskQueueIPC from "./taskQueueIPC";
import terminal from "./terminal";
import theme from "./theme";
import url from "./url";

contextBridge.exposeInMainWorld("contextMenu", contextMenu);
contextBridge.exposeInMainWorld("lifecycle", lifecycle);
contextBridge.exposeInMainWorld("openExternalLink", openExternalLink);
contextBridge.exposeInMainWorld("openProduct", openProduct);
contextBridge.exposeInMainWorld("platform", platform);
contextBridge.exposeInMainWorld("settings", settings);
contextBridge.exposeInMainWorld("sourceRepositories", sourceRepositories);
contextBridge.exposeInMainWorld("taskQueueIPC", taskQueueIPC);
contextBridge.exposeInMainWorld("terminal", terminal);
contextBridge.exposeInMainWorld("theme", theme);
contextBridge.exposeInMainWorld("url", url);

ipcRenderer.on("focus_search_bar", () => {
  const searchBar = document.querySelector("#search-bar") as HTMLInputElement;
  searchBar.focus();
  searchBar.select();
});

ipcRenderer.on("toggle_settings", () => {
  const settingsButton = document.querySelector("openstore-settings-button")!;
  settingsButton.dispatchEvent(new Event("togglePaneShown"));
});
ipcRenderer.on("show_settings", () => {
  const settingsButton = document.querySelector("openstore-settings-button")!;
  settingsButton.dispatchEvent(new Event("showPane"));
});

ipcRenderer.on("toggle_tasks", () => {
  const settingsButton = document.querySelector("openstore-tasks-button")!;
  settingsButton.dispatchEvent(new Event("togglePaneShown"));
});
