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
import { PromptForPasswordTask } from "tasks/Task";
import settings from "preload/shared/settings";
import path from "path";
import brew from "./brew";
import { runBackgroundProcess } from "../shared";

// TODO: Make user-configurable?
const rebuildIndexAfterSeconds = 60 * 60 * 24; // 1 day

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
    [caskToken: string]: [
      {
        cask: string;
        count: number;
      }
    ];
  };
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
      rebuildIndexAfterSeconds;

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

    await (brewCask as any)._ingestCaskInfo(casks, {
      analytics: await (brewCask as any)._fetchOfficialAnalytics(),
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

    const analytics = await (brewCask as any)._fetchOfficialAnalytics();

    await (brewCask as any)._ingestCaskInfo(casksFromAPI, {
      analytics,
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

    cacheDB_updateLastFullIndexJsTimestamp();
  },

  async _ingestCaskInfo(
    casks: BrewCaskPackageInfo[],
    {
      analytics,
      deleteIfUnavailable,
    }: {
      analytics?: BrewAnalyticsAll;
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
          casks.installed_365d
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
          casks.installed_365d
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
    };
  },

  async install(caskName: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const callbackID = terminal.onReceive((data) => {
        if (data.match(/^Password:/im)) {
          taskQueue.push(
            {
              type: "prompt-for-password",
              label: `Authenticate to install ${caskName}`,
              prompt: `The installer for '${caskName}' requires elevated privileges.\n\nEnter your password to allow this.`,
            } as PromptForPasswordTask,
            ["before"]
          );
        }
        if (
          data.match(new RegExp(`Cask '${caskName}' is already installed`, "i"))
        ) {
          terminal.offReceive(callbackID);
          return resolve(false);
        }
        if (data.match(/(?<!')-- openstore-succeeded: cask-install --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/(?<!')-- openstore-failed: cask-install --/)) {
          terminal.offReceive(callbackID);
          return resolve(false);
        }
      });

      terminal.send(
        quote([
          await getBrewExecutablePath(),
          "install",
          ...(await getQuarantineFlags()),
          "--cask",
          caskName,
        ]) +
          " && echo '-- openstore-succeeded: cask-install --' || echo '-- openstore-failed: cask-install --'\n"
      );
    });
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
        if (data.match(/(?<!')-- openstore-succeeded: cask-upgrade --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/(?<!')-- openstore-failed: cask-upgrade --/)) {
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
          " && echo '-- openstore-succeeded: cask-upgrade --' || echo '-- openstore-failed: cask-upgrade --'\n"
      );
    });
  },

  async uninstall(caskName: string): Promise<boolean> {
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
        if (data.match(/(?<!')-- openstore-succeeded: cask-uninstall --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/(?<!')-- openstore-failed: cask-uninstall --/)) {
          terminal.offReceive(callbackID);
          return resolve(false);
        }
      });

      terminal.send(
        quote([
          await getBrewExecutablePath(),
          "uninstall",
          "--cask",
          caskName,
        ]) +
          " && echo '-- openstore-succeeded: cask-uninstall --' || echo '-- openstore-failed: cask-uninstall --'\n"
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
