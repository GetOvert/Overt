import { contextBridge } from "electron";
import brewCask from "./brewCask";
import contextMenu from "./contextMenu";
import openExternalLink from "./openExternalLink";
import openProduct from "./openProduct";
import settings from "./settings";
import taskQueueIPC from "./taskQueueIPC";
import terminal from "./terminal";
import theme from "./theme";

contextBridge.exposeInMainWorld("brewCask", brewCask);
contextBridge.exposeInMainWorld("contextMenu", contextMenu);
contextBridge.exposeInMainWorld("openExternalLink", openExternalLink);
contextBridge.exposeInMainWorld("openProduct", openProduct);
contextBridge.exposeInMainWorld("settings", settings);
contextBridge.exposeInMainWorld("taskQueueIPC", taskQueueIPC);
contextBridge.exposeInMainWorld("terminal", terminal);
contextBridge.exposeInMainWorld("theme", theme);
