import { quote } from "shell-quote";

import {
  cacheDB,
  cacheDB_addSchema,
  cacheDB_lastFullIndexJsTimestamp,
  cacheDB_updateLastFullIndexJsTimestamp,
} from "preload/shared/db/cacheDB";
import {
  deleteAllRecords,
  deleteRecords,
  insertOrReplaceRecords,
  sql,
} from "preload/shared/db/sql";
import {
  BrewCaskPackageInfo,
  IPCBrewCask,
  SortKey,
} from "ipc/package-managers/macOS/IPCBrewCask";
import terminal from "preload/shared/terminal";
import * as taskQueue from "preload/shared/taskQueueIPC";
import { ConfirmActionTask, PromptForPasswordTask } from "tasks/Task";
import settings from "preload/shared/settings";
import path from "path";
import brew from "./brew";
import { getFullIndexIntervalInSeconds, runBackgroundProcess } from "../shared";
import { Launchable } from "ipc/package-managers/IPCPackageManager";
import * as plist from "plist";

if (process.platform === "darwin") {
  cacheDB_addSchema(
    sql`
      CREATE TABLE IF NOT EXISTS "casks" (
        "token" TEXT NOT NULL COLLATE NOCASE,
        "full_token" TEXT COLLATE NOCASE PRIMARY KEY,
        "tap" TEXT NOT NULL COLLATE NOCASE,
        "name" TEXT,
        "version" TEXT,
        "desc" TEXT,
        "homepage" TEXT,
        "installed" TEXT, -- Version of the cask installed on this machine, or null if not installed
        "outdated" BOOLEAN,
        "auto_updates" BOOLEAN, -- Whether the cask updates itself (without brew's help)
        "json" TEXT,
        "installed_30d" INTEGER, -- Install count analytics for last 30 days
        "installed_90d" INTEGER, -- Install count analytics for last 90 days
        "installed_365d" INTEGER, -- Install count analytics for last 365 days
        "updated" TIMESTAMP, -- Last time the cask was updated
        "added" TIMESTAMP -- Time the cask was added to the Homebrew
      )`
  );
}

let indexListeners = new Set<() => void>();

export type TapInfo = {
  name: string;
  user: string;
  repo: string;
  path: string;
  installed: boolean;
  official: boolean;

  formula_names: string[];
  formula_files: string[];
  cask_tokens: string[];
  cask_files: string[];
  command_files: string[];

  remote: string;
  custom_remote: string | null;
  private: boolean;
};

export type BrewAnalyticsAll = {
  installed_30d: BrewAnalyticsResponse;
  installed_90d: BrewAnalyticsResponse;
  installed_365d: BrewAnalyticsResponse;
};

export type BrewAnalyticsResponse = {
  formulae: {
    [name: string]: [
      {
        cask: string;
        count: number;
      }
    ];
  };
};

export type BrewUpdateTimes = {
  formula: {
    [fullName: string]: number;
  };
  cask: {
    [fullToken: string]: number;
  };
};

export type BrewUpdateTimesResponse = {
  commit: string;
  by_name: BrewUpdateTimes;
};

// const impl = new (class {
// async rebuildIndex(condition, wipeIndexFirst) {
// }
// })();

// function objectFromPrototype(objectWithPrototype: ): any {
//   const prototype = Object.getPrototypeOf(objectWithPrototype);
//   const properties = Object.getOwnPropertyNames(
//     prototype
//   );

//   const newObject: object = {};
//   for (const property of properties) {
//     newObject[property] = prototype[property];
//   }
// }

const brewCask: IPCBrewCask = {
  name: "brew-cask",
  supportsZapUninstall: true,

  addIndexListener(listener: () => void) {
    indexListeners.add(listener);
  },

  async rebuildIndex(condition, wipeIndexFirst) {
    if (!condition) condition = "always";

    let indexExists = false;
    try {
      indexExists =
        cacheDB()
          .prepare(sql`SELECT "rowid" FROM "casks" LIMIT 1`)
          .get() !== undefined;
    } catch (e) {}

    const nowTime = new Date().getTime();
    const indexTooOld =
      (nowTime - cacheDB_lastFullIndexJsTimestamp()) / 1000 >
      (await getFullIndexIntervalInSeconds());

    if (
      !indexExists ||
      (condition === "if-too-old" && indexTooOld) ||
      condition === "always"
    ) {
      if (wipeIndexFirst) deleteAllRecords(cacheDB(), "casks");
      await brewCask.indexAll();
    }
  },

  async indexAll(): Promise<void> {
    try {
      await runBackgroundBrewProcess(["update", "--quiet"]);
    } catch (error) {
      console.error(error);
      return await (brewCask as any)._indexWithoutInternet();
    }

    await Promise.all([
      (brewCask as any)._indexOfficial(),
      (brewCask as any)._indexUnofficial(),
    ]);

    (brewCask as any)._postIndexing();
    cacheDB_updateLastFullIndexJsTimestamp();
  },

  async indexOutdated(): Promise<void> {
    const stdout: string = await runBackgroundBrewProcess([
      "outdated",
      "--cask",
      "--greedy-latest",
    ]);

    await brewCask.indexSpecific(stdout.split(/\s+/).filter((s) => s));
  },

  async indexSpecific(caskNames: string[]): Promise<void> {
    const { casks } = JSON.parse(
      await runBackgroundBrewProcess([
        "info",
        "--json=v2",
        "--cask",
        ...caskNames,
      ])
    );

    const [analytics, updateTimes] = await Promise.all([
      (brewCask as any)._fetchOfficialAnalytics(),
      fetchUpdateTimes(),
    ]);

    await (brewCask as any)._ingestCaskInfo(casks, {
      analytics,
      updateTimes,
      deleteIfUnavailable: caskNames,
    });

    (brewCask as any)._postIndexing();
  },

  async _indexOfficial(): Promise<void> {
    const casksFromAPI: BrewCaskPackageInfo[] = await (
      await fetch("https://formulae.brew.sh/api/cask.json")
    ).json();

    // The API returns some garbage `installed` and `outdated` values,
    // so make sure those fields are cleared
    for (const cask of casksFromAPI) {
      cask.installed = null;
      cask.outdated = false;
    }

    const [analytics, updateTimes] = await Promise.all([
      (brewCask as any)._fetchOfficialAnalytics(),
      fetchUpdateTimes(),
    ]);

    await (brewCask as any)._ingestCaskInfo(casksFromAPI, {
      analytics,
      updateTimes,
    });

    // The API response can't tell us what's installed locally,
    // so reindex installed packages as a 2nd step
    const { casks } = JSON.parse(
      await runBackgroundBrewProcess([
        "info",
        "--json=v2",
        "--cask",
        "--installed",
      ])
    );

    await (brewCask as any)._ingestCaskInfo(casks, {
      analytics,
      updateTimes,
    });
  },

  async _fetchOfficialAnalytics(): Promise<BrewAnalyticsAll> {
    const [installed_30d, installed_90d, installed_365d] = await Promise.all(
      ["30d", "90d", "365d"].map(
        async (days) =>
          await (
            await fetch(
              `https://formulae.brew.sh/api/analytics/cask-install/homebrew-cask/${days}.json`
            )
          ).json()
      )
    );

    return {
      installed_30d,
      installed_90d,
      installed_365d,
    };
  },

  async _indexUnofficial(): Promise<void> {
    const taps: TapInfo[] = JSON.parse(
      await runBackgroundBrewProcess(["tap-info", "--json=v1", "--installed"])
    );

    const unofficialTaps: TapInfo[] = taps.filter(({ official }) => !official);

    const unofficialCasks = unofficialTaps.flatMap(
      ({ cask_tokens }) => cask_tokens
    );

    await brewCask.indexSpecific(unofficialCasks);
  },

  async _indexWithoutInternet(): Promise<void> {
    const { casks } = JSON.parse(
      await runBackgroundBrewProcess([
        "info",
        "--json=v2",
        "--cask",
        "--eval-all",
      ])
    );

    await (brewCask as any)._ingestCaskInfo(casks);
  },

  _postIndexing(): void {
    indexListeners.forEach((listener) => listener());
    indexListeners.clear();
  },

  async _ingestCaskInfo(
    casks: BrewCaskPackageInfo[],
    {
      analytics,
      updateTimes,
      deleteIfUnavailable,
    }: {
      analytics?: BrewAnalyticsAll;
      updateTimes?: BrewUpdateTimes;
      deleteIfUnavailable?: string[];
    } = {}
  ) {
    const { installed_30d, installed_90d, installed_365d } = analytics ?? {};

    insertOrReplaceRecords(
      cacheDB(),
      "casks",
      [
        "token",
        "full_token",
        "tap",
        "name",
        "version",
        "desc",
        "homepage",
        "installed",
        "outdated",
        "auto_updates",
        "json",
        "installed_30d",
        "installed_90d",
        "installed_365d",
        "updated",
      ],
      casks.map((cask) => ({
        ...cask,
        name: JSON.stringify(cask.name),
        installed: cask.installed,
        outdated: +cask.outdated,
        auto_updates: cask.auto_updates ? 1 : 0,

        installed_30d: installed_30d?.formulae?.[cask.full_token]?.[0]?.count
          ?.toString()
          .replaceAll(/[^\d]/g, ""),
        installed_90d: installed_90d?.formulae?.[cask.full_token]?.[0]?.count
          ?.toString()
          .replaceAll(/[^\d]/g, ""),
        installed_365d: installed_365d?.formulae?.[cask.full_token]?.[0]?.count
          ?.toString()
          .replaceAll(/[^\d]/g, ""),

        updated: updateTimes?.cask?.[cask.full_token],

        json: JSON.stringify(cask),
      }))
    );

    if (deleteIfUnavailable) {
      deleteRecords(
        cacheDB(),
        "casks",
        deleteIfUnavailable
          .map((caskName) => {
            const caskInfo = brewCask.info(caskName);
            if (!caskInfo) return null; // Not in DB anyway
            if (caskInfo?.installed) return null; // Still installed

            // Cask should be deleted from DB
            return (caskInfo as any).rowid;
          })
          .filter((x) => x)
      );
    }
  },

  search(searchString, sortBy, filterBy, limit, offset) {
    const keywords = searchString.split(/\s+/);

    return cacheDB()
      .prepare(
        sql`
        SELECT
          casks.json,
          casks.installed_30d,
          casks.installed_90d,
          casks.installed_365d,
          casks.updated
        FROM casks
        WHERE
          (${keywords
            .map(
              (keyword, index) => sql`
                (casks.full_token LIKE $pattern${index}
                  OR casks.name LIKE $pattern${index}
                  OR casks.desc LIKE $pattern${index})`
            )
            .join(sql` AND `)})
          ${(() => {
            switch (filterBy) {
              case "all":
                return "";
              case "available":
                return sql`AND casks.installed IS NULL`;
              case "installed":
                return sql`AND casks.installed IS NOT NULL`;
              case "updates":
                return sql`AND casks.outdated`;
            }
          })()}
        ORDER BY casks.${dbKeyForSortKey(sortBy)} DESC
        LIMIT $l OFFSET $o
      `
      )
      .bind({
        ...Object.fromEntries(
          keywords.map((keyword, index) => [`pattern${index}`, `%${keyword}%`])
        ),
        l: limit,
        o: offset,
      })
      .all()
      .map((row) => ({
        ...JSON.parse(row.json),

        installed_30d: row.installed_30d ?? 0,
        installed_90d: row.installed_90d ?? 0,
        installed_365d: row.installed_365d ?? 0,

        updated: row.updated,
      }));
  },

  info(caskName: string): BrewCaskPackageInfo | null {
    const row = cacheDB()
      .prepare(
        sql`
        SELECT
          casks.json,
          casks.installed_30d,
          casks.installed_90d,
          casks.installed_365d,
          casks.updated
        FROM casks
        WHERE
          casks.full_token = $caskName
        LIMIT 1
      `
      )
      .bind({
        caskName,
      })
      .get();
    if (!row) return null;

    return {
      rowid: row.rowid,

      ...JSON.parse(row.json),

      installed_30d: row.installed_30d,
      installed_90d: row.installed_90d,
      installed_365d: row.installed_365d,

      updated: row.updated,
    };
  },

  async install(caskName: string): Promise<boolean> {
    const runInstallCommand = async (
      resolve: (value: boolean | PromiseLike<boolean>) => void,
      reject: (reason?: any) => void,
      force: boolean = false
    ) => {
      const callbackID = terminal.onReceive((data) => {
        if (data.match(/^Password:/im)) {
          taskQueue.push<PromptForPasswordTask>(
            {
              type: "prompt-for-password",
              label: `Authenticate to install ${caskName}`,
              prompt: `The installer for '${caskName}' requires elevated privileges.\n\nEnter your password to allow this.`,
            },
            ["before"]
          );
        }
        if (data.match(/different from the one being installed/)) {
          taskQueue.push<ConfirmActionTask>(
            {
              type: "confirm-action",
              label: `Confirm overwrite of ${caskName}`,

              promptTitle: `Overwrite with new version?`,
              prompt: `A different version of ${caskName} is currently installed. Would you like to overwrite it?`,
              promptCannedMessage: `
                <p class="text-warning">
                  Overt's version of this app is probably newer, but not necessarily.
                </p>
                <p class="text-info">
                  Custom icons trigger this message. If you continue, any custom icons on this app will be lost.
                </p>
              `,
              url: null,
              confirmButtonTitle: "Overwrite",
              cancelButtonTitle: "Cancel",

              action: () =>
                runInstallCommand(resolve, reject, /* force: */ true),
              cancel: () => resolve(false),
            },
            []
          );

          terminal.offReceive(callbackID);
        }
        if (data.match(/(?<!')-- overt-succeeded: cask-install --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/(?<!')-- overt-failed: cask-install --/)) {
          terminal.offReceive(callbackID);
          return resolve(false);
        }
      });

      terminal.send(
        quote([
          await getBrewExecutablePath(),
          "install",
          force ? "--force" : "--adopt",
          ...(await getQuarantineFlags()),
          "--cask",
          caskName,
        ]) +
          " && echo '-- overt-succeeded: cask-install --' || echo '-- overt-failed: cask-install --'\n"
      );
    };

    return new Promise(runInstallCommand);
  },

  async upgrade(caskName: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const callbackID = terminal.onReceive((data) => {
        if (data.match(/^Password:/im)) {
          taskQueue.push(
            {
              type: "prompt-for-password",
              label: `Authenticate to update ${caskName}`,
              prompt: `The updater for '${caskName}' requires elevated privileges.\n\nEnter your password to allow this.`,
            } as PromptForPasswordTask,
            ["before"]
          );
        }
        if (data.match(/(?<!')-- overt-succeeded: cask-upgrade --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/(?<!')-- overt-failed: cask-upgrade --/)) {
          terminal.offReceive(callbackID);
          return resolve(false);
        }
      });

      terminal.send(
        quote([
          await getBrewExecutablePath(),
          "upgrade",
          ...(await getQuarantineFlags()),
          "--cask",
          caskName,
        ]) +
          " && echo '-- overt-succeeded: cask-upgrade --' || echo '-- overt-failed: cask-upgrade --'\n"
      );
    });
  },

  async uninstall(
    caskName: string,
    { zap }: { zap?: boolean } = {}
  ): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const callbackID = terminal.onReceive((data) => {
        if (data.match(/^Password:/im)) {
          taskQueue.push(
            {
              type: "prompt-for-password",
              label: `Authenticate to uninstall ${caskName}`,
              prompt: `The uninstaller for '${caskName}' requires elevated privileges.\n\nEnter your password to allow this.`,
            } as PromptForPasswordTask,
            ["before"]
          );
        }
        if (data.match(/(?<!')-- overt-succeeded: cask-uninstall --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/(?<!')-- overt-failed: cask-uninstall --/)) {
          terminal.offReceive(callbackID);
          return resolve(false);
        }
      });

      terminal.send(
        quote([
          await getBrewExecutablePath(),
          "uninstall",
          ...(zap ? ["--zap"] : []),
          "--cask",
          caskName,
        ]) +
          " && echo '-- overt-succeeded: cask-uninstall --' || echo '-- overt-failed: cask-uninstall --'\n"
      );
    });
  },

  async indexSourceRepositories(): Promise<void> {
    // Handled by brew
  },

  addSourceRepository(name: string, url: string): Promise<boolean> {
    return brew.addSourceRepository(name, url);
  },

  removeSourceRepository(name: string): Promise<boolean> {
    return brew.removeSourceRepository(name);
  },

  async launchables(packageInfo: BrewCaskPackageInfo): Promise<Launchable[]> {
    async function pathsForPkg(pkgIdentifier: string): Promise<string[]> {
      try {
        const receiptPlist = plist.parse(
          await runBackgroundProcess("/usr/sbin/pkgutil", [
            "--pkg-info-plist",
            pkgIdentifier,
          ])
        ) as plist.PlistObject;
        const installationBasePath = `${receiptPlist["volume"]}/${receiptPlist["install-location"]}`;

        const subpaths = (
          await runBackgroundProcess("/usr/sbin/pkgutil", [
            "--only-dirs",
            "--files",
            pkgIdentifier,
          ])
        ).split(/\r?\n/);

        return subpaths.map((subpath) => `${installationBasePath}/${subpath}`);
      } catch (error) {
        console.error(error);
        return [];
      }
    }
    async function flatAll<T>(promises: Promise<T[]>[]): Promise<T[]> {
      return (await Promise.all(promises)).flat(1);
    }
    function asArray<T>(input: T | T[]): T[] {
      return Array.isArray(input) ? input : [input];
    }

    const paths = await flatAll(
      packageInfo.artifacts.map(async (artifact): Promise<string[]> => {
        if ("app" in artifact) {
          return artifact.app.map((app) => `/Applications/${app}`);
        }
        if ("uninstall" in artifact) {
          return await flatAll(
            artifact.uninstall.map(async (uninstall): Promise<string[]> => {
              if ("pkgutil" in uninstall) {
                return await flatAll(
                  asArray(uninstall.pkgutil).map(pathsForPkg)
                );
              }
              return [];
            })
          );
        }
        return [];
      })
    );

    const appPaths = paths.filter(
      (path) =>
        path.match(/\.app$/) &&
        // Drop apps nested inside other apps
        !path.match(/\.app\//)
    );

    return appPaths.flatMap((path) => {
      const label = path.match(/[^\/]+(?=\.app$)/)?.[0];
      if (!label) return [];

      return [{ path, label }];
    });
  },
};

function dbKeyForSortKey(sortKey: SortKey): string {
  switch (sortKey) {
    case "installed-30d":
      return "installed_30d";
    case "installed-90d":
      return "installed_90d";
    case "installed-365d":
      return "installed_365d";
    case "updated":
      return "updated";
    case "added":
    default:
      return "added";
  }
}

export async function fetchUpdateTimes(): Promise<BrewUpdateTimes> {
  const taps: TapInfo[] = JSON.parse(
    await runBackgroundBrewProcess(["tap-info", "--json=v1", "--installed"])
  );

  const responses: BrewUpdateTimesResponse[] = (
    await Promise.all(
      taps.map(async ({ name }) => {
        const res = await fetch(
          `https://storage.googleapis.com/storage.getovert.app/brew/${name}/update-times.json`
        );
        if (!res.ok) return null;

        return await res.json();
      })
    )
  ).filter((x) => x);

  return {
    formula: Object.assign(
      {},
      ...responses.map(({ by_name }) => by_name?.formula)
    ),
    cask: Object.assign({}, ...responses.map(({ by_name }) => by_name?.cask)),
  };
}

export async function runBackgroundBrewProcess(
  args: string[]
): Promise<string> {
  return await runBackgroundProcess(await getBrewExecutablePath(), args);
}

export async function getBrewExecutablePath(): Promise<string> {
  return path.join(await settings.get("homebrewPath"), "bin", "brew");
}

export async function getQuarantineFlags(): Promise<string[]> {
  return [
    `--${
      (await settings.get("validateCodeSignatures")) ? "" : "no-"
    }quarantine`,
  ];
}

export default brewCask;
