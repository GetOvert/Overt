import { spawn } from "child_process";
import { quote } from "shell-quote";

import {
  cacheDB,
  cacheDB_addSchema,
  cacheDB_ModifiedTimeAtLaunch,
} from "../cacheDB";
import {
  deleteAllRecords,
  deleteRecords,
  insertOrReplaceRecords,
  sql,
} from "util/sql";
import {
  BrewCaskPackageInfo,
  IPCBrewCask,
  SortKey,
} from "ipc/package-managers/macOS/IPCBrewCask";
import terminal from "../terminal";
import * as taskQueue from "../taskQueueIPC";
import { PromptForPasswordTask } from "components/tasks/model/Task";
import settings from "../settings";
import path from "path";
import { SourceRepository } from "package-manager/SourceRepository";
import brew from "./brew";

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
        "auto_updates" BOOLEAN, -- Whether the cask auto-updates
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

type CaskAnalyticsData = {
  formulae: { [key: string]: { cask: string; count: number } };
};

const brewCask: IPCBrewCask = {
  name: "brew-cask",

  addIndexListener(listener: () => void) {
    indexListeners.add(listener);
  },

  async reindexOutdated(): Promise<void> {
    const brewProcess = spawn(await getBrewExecutablePath(), [
      "outdated",
      "--cask",
      "--greedy-latest",
    ]);

    let stdout = "";
    let stderr = "";
    brewProcess.stdout.on("data", (data) => {
      stdout += data;
    });
    brewProcess.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
      stderr += data;
    });

    return new Promise((resolve, reject) => {
      brewProcess.on("exit", async (code) => {
        await brewCask.updateIndex(stdout.split(/\s+/).filter((s) => s));
        resolve();
      });
      brewProcess.on("error", reject);
    });
  },

  async rebuildIndex(condition, wipeIndexFirst) {
    if (!condition) condition = "always";

    let indexExists = false;
    try {
      indexExists =
        (await cacheDB())
          .prepare(sql`SELECT "rowid" FROM "casks" LIMIT 1`)
          .get() !== undefined;
    } catch (e) {}

    const nowTime = new Date().getTime();
    const indexTooOld =
      (nowTime - (await cacheDB_ModifiedTimeAtLaunch())) / 1000 >
      rebuildIndexAfterSeconds;

    if (
      !indexExists ||
      (condition === "if-too-old" && indexTooOld) ||
      condition === "always"
    ) {
      if (wipeIndexFirst) deleteAllRecords(await cacheDB(), "casks");
      await brewCask.updateIndex();
    }
  },

  async updateIndex(caskNames?: string[]): Promise<void> {
    if (Array.isArray(caskNames) && caskNames.length === 0) return;

    (await (async () => {
      if (!caskNames) {
        // Updating index for all, so we'd might as well fetch from remote
        // while we're at it.
        try {
          await (brewCask as any)._runBrewUpdate();
        } catch (error) {
          // Bad omen...
          console.error(error);
        }
      }

      const brewProcess = spawn(await getBrewExecutablePath(), [
        "info",
        "--json=v2",
        "--cask",
        ...(caskNames ?? ["--all"]),
      ]);

      let json = "";
      let stderr = "";
      brewProcess.stdout.on("data", (data) => {
        json += data;
      });
      brewProcess.stderr.on("data", (data) => {
        console.error(`stderr: ${data}`);
        stderr += data;
      });

      return new Promise((resolve, reject) => {
        brewProcess.on("exit", async (code) => {
          if (code !== 0) return reject(stderr);

          const installs30d = await (
            await fetch(
              "https://formulae.brew.sh/api/analytics/cask-install/homebrew-cask/30d.json"
            )
          ).json();
          const installs90d = await (
            await fetch(
              "https://formulae.brew.sh/api/analytics/cask-install/homebrew-cask/90d.json"
            )
          ).json();
          const installs365d = await (
            await fetch(
              "https://formulae.brew.sh/api/analytics/cask-install/homebrew-cask/365d.json"
            )
          ).json();

          await (brewCask as any)._rebuildIndexFromCaskInfo(
            caskNames,
            JSON.parse(json).casks,
            installs30d,
            installs90d,
            installs365d
          );
          resolve();
        });
        brewProcess.on("error", reject);
      });
    })()) as void;

    indexListeners.forEach((listener) => listener());
    indexListeners.clear();
  },

  async _runBrewUpdate(): Promise<void> {
    const brewUpdateProcess = spawn(await getBrewExecutablePath(), [
      "update",
      "--quiet",
    ]);

    return new Promise((resolve, reject) => {
      brewUpdateProcess.on("exit", resolve);
      brewUpdateProcess.on("error", reject);
    });
  },

  async _rebuildIndexFromCaskInfo(
    caskNamesToUpdate: string[] | undefined,
    casks: any[],
    installs30d: CaskAnalyticsData,
    installs90d: CaskAnalyticsData,
    installs365d: CaskAnalyticsData
  ) {
    console.log(
      "updating casks: " +
        (Array.isArray(caskNamesToUpdate)
          ? caskNamesToUpdate.join(", ")
          : "all")
    );
    insertOrReplaceRecords(
      await cacheDB(),
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
        auto_updates: cask.auto_updates ? 1 : 0,

        installed_30d:
          installs30d?.formulae?.[cask.full_token]?.[0]?.count
            ?.toString()
            .replaceAll(/[^\d]/g, "") ?? 0,
        installed_90d:
          installs90d?.formulae?.[cask.full_token]?.[0]?.count
            ?.toString()
            .replaceAll(/[^\d]/g, "") ?? 0,
        installed_365d:
          installs365d?.formulae?.[cask.full_token]?.[0]?.count
            ?.toString()
            .replaceAll(/[^\d]/g, "") ?? 0,

        json: JSON.stringify(cask),
      }))
    );

    if (caskNamesToUpdate) {
      deleteRecords(
        await cacheDB(),
        "casks",
        caskNamesToUpdate
          .map((caskName) => {
            const caskInfo: any = brewCask.info(caskName);
            if (!caskInfo) return null; // Not in DB anyway
            if (caskInfo?.installed) return null; // Still installed

            return caskInfo.rowid; // Delete from DB
          })
          .filter((x) => x)
      );
    }
  },

  async search(searchString, sortBy, filterBy, limit, offset) {
    const keywords = searchString.split(/\s+/);

    return (await cacheDB())
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
                return sql`
                  AND casks.installed IS NOT NULL
                  AND casks.installed != casks.version
                  AND casks.auto_updates = 0
                `;
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

  async info(caskName: string): Promise<BrewCaskPackageInfo> {
    const row = (await cacheDB())
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
      installed_30d: row.installed_30d ?? 0,
      installed_90d: row.installed_90d ?? 0,
      installed_365d: row.installed_365d ?? 0,
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

  async reindexSourceRepositories(): Promise<void> {
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
