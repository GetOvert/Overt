/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import "bootswatch/dist/sandstone/bootstrap.min.css";
import "styles/all.css";
import "styles/injection";

import "nav/nav";

import "components/accessibility/KeyboardNavSkipLinks";
import "components/sidebar/Sidebar";
import "components/top-bar/TopBar";
import "components/top-bar/SearchBar";
import "components/packages/PackagesView";
import "components/packages/PackageDetailView";
import "components/settings/SettingsPane";
import "components/settings/SettingsButton";
import "components/tasks/TasksPane";
import "components/tasks/TasksButton";
import "components/ui-elements/floating-pane/FloatingPane";
import "components/ui-elements/icon-button/IconButton";
import "components/terminal/TerminalButton";
import "components/terminal/terminal";
import "tasks/processing/task-processing";
import "tasks/processing/url-handling";
import "tasks/processing/task-notifications";
import "components/modal/PasswordPromptModal";

import taskQueue from "tasks/TaskQueue";
import {
  ReceiveBroadcastsTask,
  ReindexAllTask,
  ReindexOutdatedTask,
  ReindexSourceRepositoriesTask,
} from "tasks/Task";
import { allPackageMangers } from "package-manager/PackageManagerRegistry";

window.addEventListener("load", async () => {
  (window as any).openStore.updateWindowLocationFragment({
    source:
      window.platform.getNodePlatformString() === "darwin"
        ? "brew-cask"
        : "scoop",
    filter: "all",
    sort: "installed-30d",
  });

  taskQueue.push<ReceiveBroadcastsTask>({
    type: "receive-broadcasts",
    label: "Check for messages from Overt",
  });

  for (const packageManager of allPackageMangers) {
    taskQueue.push<ReindexSourceRepositoriesTask>({
      packageManager,
      type: "reindex-source-repositories",
      label: `Rebuild source list (${packageManager})`,
    });
  }

  if (await window.settings.get("indexOnNextLaunch")) {
    await window.settings.set("indexOnNextLaunch", false);

    for (const packageManager of allPackageMangers) {
      taskQueue.push<ReindexAllTask>({
        packageManager,
        type: "reindex-all",
        label: `Rebuild catalog (${packageManager})`,
        condition: "always",
      });
    }
  } else {
    for (const packageManager of allPackageMangers) {
      taskQueue.push<ReindexAllTask>({
        packageManager,
        type: "reindex-all",
        label: `Rebuild catalog if too old (${packageManager})`,
        condition: "if-too-old",
      });
    }
  }

  for (const packageManager of allPackageMangers) {
    taskQueue.push<ReindexOutdatedTask>({
      packageManager,
      type: "reindex-outdated",
      label: `Check for updates (${packageManager})`,
    });
  }
});
