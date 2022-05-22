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

// import { auto as followSystemColorScheme, setFetchMethod } from "darkreader";
import Color from "color";

import "bootswatch/dist/sandstone/bootstrap.min.css";
import "styles/default.css";

import "core/nav";

import "components/sidebar/Sidebar";
import "components/packages/PackagesView";
import "components/packages/PackageDetailView";
import "components/tasks/TasksPane";
import "components/settings/SettingsPane";
import "components/tasks/TasksButton";
import "components/settings-button/SettingsButton";
import "components/floating-pane/FloatingPane";
import "components/icon-button/IconButton";
import "components/terminal/TerminalButton";
import "components/terminal/terminal";
import "components/task-processing";
import "components/tasks/task-notifications";
import "components/modal/PasswordPromptModal";

import taskQueue from "components/tasks/model/TaskQueue";
import {
  ReindexAllTask,
  ReindexOutdatedTask,
} from "components/tasks/model/Task";
import { allPackageMangers } from "package-manager/PackageManagerRegistry";

const accentColor = window.theme.getAccentColor();
document.documentElement.style.setProperty("--accent-color", accentColor);
document.documentElement.style.setProperty(
  "--accent-color-dark",
  new Color(accentColor).darken(0.2).string()
);

// setFetchMethod(window.fetch);
/*
followSystemColorScheme(
  {
    brightness: 100,
    contrast: 90,
    sepia: 10,
  },
  {
    invert: [],
    css: `
      a:not(.nav-link.active), .nav-link:not(.active) {
        color: var(--accent-color) !important;
      }
      a:hover, .nav-link:hover {
        color: var(--accent-color-dark) !important;
      }
      .nav-pills .nav-link.active {
        background-color: var(--accent-color) !important;
      }
    `,
    ignoreInlineStyle: [],
    ignoreImageAnalysis: [],
    disableStyleSheetsProxy: true,
  }
);*/

window.addEventListener("load", () => {
  (window as any).openStore.updateWindowLocationFragment({
    source: "brew-cask",
    filter: "all",
    sort: "installed-30d",
  });

  for (const packageManager of allPackageMangers) {
    taskQueue.push({
      packageManager,
      type: "reindex-all",
      label: `Rebuild catalog if too old (${packageManager})`,
      condition: "if-too-old",
    } as ReindexAllTask);
  }
  for (const packageManager of allPackageMangers) {
    taskQueue.push({
      packageManager,
      type: "reindex-outdated",
      label: `Check for updates (${packageManager})`,
    } as ReindexOutdatedTask);
  }
});
