import { app, BrowserWindow, Menu } from "electron";

export function initAppMenu() {
  const isMac = process.platform === "darwin";

  const template: (Electron.MenuItem | Electron.MenuItemConstructorOptions)[] =
    [
      // { role: 'appMenu' }
      ...((isMac
        ? [
            {
              label: app.name,
              submenu: [
                { role: "about" },
                { type: "separator" },
                {
                  label: "Preferences…",
                  accelerator: "CmdOrCtrl+,",
                  click(menuItem, browserWindow) {
                    browserWindow?.webContents.send("show_settings");
                  },
                },
                { type: "separator" },
                { role: "services" },
                { type: "separator" },
                { role: "hide" },
                { role: "hideOthers" },
                { role: "unhide" },
                { type: "separator" },
                { role: "quit" },
              ],
            },
          ]
        : []) as Electron.MenuItemConstructorOptions[]),
      // { role: 'fileMenu' }
      ...((isMac
        ? []
        : [
            {
              label: "File",
              submenu: [{ role: "quit" }],
            },
          ]) as Electron.MenuItemConstructorOptions[]),
      // { role: 'editMenu' }
      {
        label: "Edit",
        submenu: [
          { role: "undo" },
          { role: "redo" },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          ...((isMac
            ? [
                { role: "pasteAndMatchStyle" },
                { role: "delete" },
                { role: "selectAll" },
                { type: "separator" },
                {
                  label: "Speech",
                  submenu: [
                    { role: "startSpeaking" },
                    { role: "stopSpeaking" },
                  ],
                },
              ]
            : [
                { role: "delete" },
                { type: "separator" },
                { role: "selectAll" },
              ]) as Electron.MenuItemConstructorOptions[]),
        ],
      },
      // { role: 'viewMenu' }
      {
        label: "View",
        submenu: [
          {
            label: "Back",
            accelerator: "CmdOrCtrl+[",
            click(menuItem, browserWindow) {
              browserWindow?.webContents.goBack();
            },
          },
          {
            label: "Forward",
            accelerator: "CmdOrCtrl+]",
            click(menuItem, browserWindow) {
              browserWindow?.webContents.goForward();
            },
          },
          {
            label: "Focus Search Bar",
            accelerator: "CmdOrCtrl+F",
            click(menuItem, browserWindow) {
              browserWindow?.webContents.send("focus_search_bar");
            },
          },
          { type: "separator" },
          {
            label: "Toggle Tasks Pane",
            accelerator: "CmdOrCtrl+Alt+T",
            click(menuItem, browserWindow) {
              browserWindow?.webContents.send("toggle_tasks");
            },
          },
          {
            label: "Toggle Settings Pane",
            accelerator: "CmdOrCtrl+Alt+,",
            click(menuItem, browserWindow) {
              browserWindow?.webContents.send("toggle_settings");
            },
          },
          { type: "separator" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { type: "separator" },
          { role: "toggleDevTools" },
          { type: "separator" },
          { role: "togglefullscreen" },
        ],
      },
      // { role: 'windowMenu' }
      {
        label: "Window",
        submenu: [
          ...((isMac
            ? [{ role: "close" }]
            : []) as Electron.MenuItemConstructorOptions[]),
          { role: "minimize" },
          { role: "zoom" },
          ...((isMac
            ? [
                { type: "separator" },
                { role: "front" },
                { type: "separator" },
                { role: "window" },
              ]
            : [{ role: "close" }]) as Electron.MenuItemConstructorOptions[]),
        ],
      },
      {
        role: "help",
        submenu: [
          {
            label: "Wiki",
            click: async () => {
              const { shell } = require("electron");
              await shell.openExternal(
                "https://github.com/GetOvert/Overt/wiki"
              );
            },
          },
          {
            label: "Discuss",
            click: async () => {
              const { shell } = require("electron");
              await shell.openExternal(
                "https://github.com/GetOvert/Overt/discussions"
              );
            },
          },
        ],
      },
    ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
