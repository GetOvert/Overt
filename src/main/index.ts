import { initAppMenu } from "./AppMenu";
import {
  app,
  BrowserWindow,
  ipcMain,
  IpcMainEvent,
  MenuItemConstructorOptions,
  session,
  systemPreferences,
} from "electron";
import { Config, config } from "shared/config";
import contextMenu from "electron-context-menu";
import ElectronStore from "electron-store";
import { accessSync, constants } from "fs";
import * as pty from "node-pty";
import { PersistentStorage } from "../shared/persistent-storage";

// This allows TypeScript to pick up the magic constant that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const SETUP_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

const accentColor = ["darwin", "win32"].includes(process.platform)
  ? systemPreferences.getAccentColor()
  : config.fallbackAccentColor;

let setupWindow: BrowserWindow;
let mainWindow: BrowserWindow;
let initialURLToHandle: string | undefined;

let store: ElectronStore<Config>;

async function createSetupWindow(): Promise<void> {
  setupWindow = new BrowserWindow({
    width: 600,
    height: 500,
    resizable: false,

    webPreferences: {
      additionalArguments: [`Overt.accentColor=${accentColor}`],
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  setupWindow.loadURL(SETUP_WINDOW_WEBPACK_ENTRY);
}

async function createMainWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 992,
    height: 600,
    minWidth: 450,
    minHeight: 400,

    webPreferences: {
      additionalArguments: [
        `Overt.accentColor=${accentColor}`,
        `Overt.cachePath=${Buffer.from(app.getPath("cache")).toString(
          "base64"
        )}`,
      ],
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },

    show: false,
  });

  // https://www.electronjs.org/docs/latest/api/browser-window#using-the-ready-to-show-event
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  mainWindow.webContents.on("did-finish-load", () => {
    if (initialURLToHandle) {
      // App was launched to handle a URL that we couldn't handle below,
      // since the main window wasn't initialized yet
      mainWindow.webContents.send("handle_url", initialURLToHandle);
    }
  });

  const ptyProcess =
    process.platform === "win32"
      ? pty.spawn("powershell.exe", [], {
          cwd: process.env.HOMEPATH,
          env: {
            ...(process.env as { [key: string]: string }),
          },
        })
      : pty.spawn("/bin/sh", [], {
          name: "xterm-color",
          cols: 220,
          rows: 26,
          cwd: process.env.HOME,
          env: {
            ...process.env,
            PS1: `\r\n${Array.from(Array(220).keys())
              .map(() => "━")
              .join("")}\r\n`,
            // Silence "move to zsh" suggestion on macOS 10.15+
            BASH_SILENCE_DEPRECATION_WARNING: "1",
          },
        });

  ipcMain.on("terminal.send", (event: IpcMainEvent, data: string) => {
    ptyProcess.write(data);
  });
  ptyProcess.onData((data: string) => {
    mainWindow.webContents.send("terminal.receive", data);
  });

  for (const [key] of store) {
    store.onDidChange(key, () => {
      mainWindow.webContents.send(`settings.${key}.change`);
    });
  }

  let contextMenuItems: {
    items: (MenuItemConstructorOptions &
      ({ callback: string; args: any[] } | { type: "separator" }))[];
  } = { items: [] };

  ipcMain.handle(
    "contextmenu.set",
    (
      event: IpcMainEvent,
      items: (MenuItemConstructorOptions &
        ({ callback: string; args: any[] } | { type: "separator" }))[]
    ) => {
      contextMenuItems.items = items.map((item) => ({
        ...item,
        click() {
          if ("callback" in item) {
            mainWindow.webContents.send(
              `contextmenu.callback.${item.callback}`,
              ...item.args
            );
          }
        },
      }));

      setTimeout(() => (contextMenuItems.items = []), 100);
    }
  );

  contextMenu({
    menu: (actions) => [
      actions.separator(),
      actions.cut({}),
      actions.copy({}),
      actions.paste({}),
    ],
    prepend: () => contextMenuItems.items,
  });

  initAppMenu();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  // Specify our Content Security Policy (CSP)
  // https://www.electronjs.org/docs/latest/tutorial/security#csp-http-headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          `
            default-src none;
            script-src 'self' ${
              // Allow use of source maps during development:
              // https://www.electronjs.org/docs/latest/api/app#appispackaged-readonly
              app.isPackaged ? "" : `'unsafe-eval'`
            };
            connect-src 'self' https://storage.googleapis.com/storage.getovert.app/ https://formulae.brew.sh;
            style-src 'self' 'unsafe-inline' data: https://fonts.googleapis.com;
            font-src 'self' https://fonts.gstatic.com;
            img-src 'self' data: https://storage.googleapis.com/storage.getovert.app/
          `,
        ],
      },
    });
  });

  // Register ourselves as a URL scheme handler
  app.setAsDefaultProtocolClient("overt");

  ipcMain.on("relaunch", () => {
    app.relaunch();
    app.quit();
  });

  ipcMain.handle("app-version.get", () => app.getVersion());

  store = new ElectronStore<Config & PersistentStorage>({
    defaults: {
      sendNativeNotifications: true,
      validateCodeSignatures: true,

      useSystemAccentColor: false,
      tintDarkBackgrounds: false,

      fullIndexIntervalDays: 3,

      autoUpdateSelf: true,
      showSetupOnNextLaunch: true,
      indexOnNextLaunch: true,
    },
  });

  ipcMain.handle(
    "settings.set",
    (event: IpcMainEvent, key: keyof Config, value: any) => {
      store.set(key, value);
    }
  );
  ipcMain.handle("settings.get", (event: IpcMainEvent, key: keyof Config) => {
    return store.get(key);
  });

  ipcMain.handle(
    "persistent-storage.set",
    (event: IpcMainEvent, key: keyof PersistentStorage, value: any) => {
      store.set(key, value);
    }
  );
  ipcMain.handle(
    "persistent-storage.get",
    (event: IpcMainEvent, key: keyof PersistentStorage) => {
      return store.get(key);
    }
  );

  try {
    if (store.get("showSetupOnNextLaunch")) throw null;
    accessSync(`${store.get("homebrewPath")}/bin/brew`, constants.X_OK);

    // OK! We have a package manager
    createMainWindow();
  } catch {
    // Need to set up a package manager
    createSetupWindow();
  }
});

// TODO: Windows code to prevent another instance from opening when a URL is handled
app.on("open-url", (event, url) => {
  if (mainWindow) {
    mainWindow.webContents.send("handle_url", url);
  } else {
    // We'll handle it above, once the main window has been initialized
    initialURLToHandle = url;
  }
});

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  app.quit();
});
