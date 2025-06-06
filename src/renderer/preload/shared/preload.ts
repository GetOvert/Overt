import TopBar from "components/top-bar/TopBar";
import { contextBridge, ipcRenderer } from "electron";
import broadcasts from "./broadcasts";
import contextMenu from "./contextMenu";
import lifecycle from "./lifecycle";
import openExternalLink from "./openExternalLink";
import openProduct from "./openProduct";
import persistentStorage from "./persistentStorage";
import platform from "./platform";
import settings from "./settings";
import sourceRepositories from "./sourceRepositories";
import taskQueueIPC from "./taskQueueIPC";
import terminal from "./terminal";
import theme from "./theme";
import url from "./url";

contextBridge.exposeInMainWorld("broadcasts", broadcasts);
contextBridge.exposeInMainWorld("contextMenu", contextMenu);
contextBridge.exposeInMainWorld("lifecycle", lifecycle);
contextBridge.exposeInMainWorld("openExternalLink", openExternalLink);
contextBridge.exposeInMainWorld("openProduct", openProduct);
contextBridge.exposeInMainWorld("persistentStorage", persistentStorage);
contextBridge.exposeInMainWorld("platform", platform);
contextBridge.exposeInMainWorld("settings", settings);
contextBridge.exposeInMainWorld("sourceRepositories", sourceRepositories);
contextBridge.exposeInMainWorld("taskQueueIPC", taskQueueIPC);
contextBridge.exposeInMainWorld("terminal", terminal);
contextBridge.exposeInMainWorld("theme", theme);
contextBridge.exposeInMainWorld("url", url);

ipcRenderer.on("focus_search_bar", () => {
  const topBar = document.querySelector("overt-top-bar") as TopBar;
  topBar.dispatchEvent(new Event("focusSearchBar"));
});

ipcRenderer.on("toggle_settings", () => {
  const topBar = document.querySelector("overt-top-bar") as TopBar;
  const settingsButton = topBar.shadowRoot!.querySelector(
    "openstore-settings-button"
  )!;
  settingsButton.dispatchEvent(new Event("togglePaneShown"));
});
ipcRenderer.on("show_settings", () => {
  const topBar = document.querySelector("overt-top-bar") as TopBar;
  const settingsButton = topBar.shadowRoot!.querySelector(
    "openstore-settings-button"
  )!;
  settingsButton.dispatchEvent(new Event("showPane"));
});

ipcRenderer.on("toggle_tasks", () => {
  const topBar = document.querySelector("overt-top-bar") as TopBar;
  const tasksButton = topBar.shadowRoot!.querySelector(
    "openstore-tasks-button"
  )!;
  tasksButton.dispatchEvent(new Event("togglePaneShown"));
});
