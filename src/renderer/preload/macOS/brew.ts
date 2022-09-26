import { spawn } from "child_process";
import { quote } from "shell-quote";

import {
  cacheDB,
  cacheDB_addSchema,
  cacheDB_lastFullIndexJsTimestamp,
  cacheDB_updateLastFullIndexJsTimestamp,
} from "../cacheDB";
import {
  deleteAllRecords,
  deleteRecords,
  insertOrReplaceRecords,
  sql,
} from "util/sql";
import {
  BrewPackageInfo,
  IPCBrew,
  SortKey,
} from "ipc/package-managers/macOS/IPCBrew";
import terminal from "../terminal";
import * as taskQueue from "../taskQueueIPC";
import { PromptForPasswordTask } from "components/tasks/model/Task";
import { getBrewExecutablePath } from "./brewCask";
import { SourceRepository } from "package-manager/SourceRepository";

// TODO: Make user-configurable?
const rebuildIndexAfterSeconds = 60 * 60 * 24; // 1 day

if (process.platform === "darwin") {
  cacheDB_addSchema(
    sql`
      CREATE TABLE IF NOT EXISTS "formulae" (
        "name" TEXT NOT NULL COLLATE NOCASE,
        "full_name" TEXT COLLATE NOCASE PRIMARY KEY,
        "tap" TEXT NOT NULL COLLATE NOCASE,
        "version" TEXT,
        "desc" TEXT,
        "homepage" TEXT,
        "installed" TEXT, -- Version of the formula installed on this machine, or null if not installed
        "outdated" BOOLEAN,
        "json" TEXT,
        "installed_30d" INTEGER, -- Install count analytics for last 30 days
        "installed_90d" INTEGER, -- Install count analytics for last 90 days
        "installed_365d" INTEGER, -- Install count analytics for last 365 days
        "updated" TIMESTAMP, -- Last time the formula was updated
        "added" TIMESTAMP -- Time the formula was added to the Homebrew
      )`
  );
}

let indexListeners = new Set<() => void>();

type FormulaAnalyticsData = {
  formulae: { [key: string]: { formula: string; count: number } };
};

const brew: IPCBrew = {
  name: "brew",

  addIndexListener(listener: () => void) {
    indexListeners.add(listener);
  },

  async reindexOutdated(): Promise<void> {
    const brewProcess = spawn(await getBrewExecutablePath(), [
      "outdated",
      "--formula",
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
        await brew.updateIndex(stdout.split(/\s+/).filter((s) => s));
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
        cacheDB()
          .prepare(sql`SELECT "rowid" FROM "formulae" LIMIT 1`)
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
      if (wipeIndexFirst) deleteAllRecords(cacheDB(), "formulae");
      await brew.updateIndex();
    }
  },

  async updateIndex(formulaNames?: string[]): Promise<void> {
    if (Array.isArray(formulaNames) && formulaNames.length === 0) return;

    (await (async () => {
      if (!formulaNames) {
        // Updating index for all, so we'd might as well fetch from remote
        // while we're at it.
        try {
          await (brew as any)._runBrewUpdate();
        } catch (error) {
          // Bad omen...
          console.error(error);
        }
      }

      const brewProcess = spawn(await getBrewExecutablePath(), [
        "info",
        "--json=v2",
        "--formula",
        ...(formulaNames ?? ["--eval-all"]),
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
              "https://formulae.brew.sh/api/analytics/install-on-request/homebrew-core/30d.json"
            )
          ).json();
          const installs90d = await (
            await fetch(
              "https://formulae.brew.sh/api/analytics/install-on-request/homebrew-core/90d.json"
            )
          ).json();
          const installs365d = await (
            await fetch(
              "https://formulae.brew.sh/api/analytics/install-on-request/homebrew-core/365d.json"
            )
          ).json();

          await (brew as any)._rebuildIndexFromFormulaInfo(
            formulaNames,
            JSON.parse(json).formulae,
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

    cacheDB_updateLastFullIndexJsTimestamp();
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

  async _rebuildIndexFromFormulaInfo(
    formulaNamesToUpdate: string[] | undefined,
    formulae: any[],
    installs30d: FormulaAnalyticsData,
    installs90d: FormulaAnalyticsData,
    installs365d: FormulaAnalyticsData
  ) {
    console.log(
      "indexing formulae: " +
        (Array.isArray(formulaNamesToUpdate)
          ? formulaNamesToUpdate.join(", ")
          : "all")
    );
    insertOrReplaceRecords(
      cacheDB(),
      "formulae",
      [
        "name",
        "full_name",
        "tap",
        "version",
        "desc",
        "homepage",
        "installed",
        "outdated",
        "json",
        "installed_30d",
        "installed_90d",
        "installed_365d",
      ],
      formulae.map((formula) => ({
        ...formula,
        version: formula.versions.stable,
        installed: formula.installed[0]?.version,
        outdated: +formula.outdated,

        installed_30d:
          installs30d?.formulae?.[formula.full_name]?.[0]?.count
            ?.toString()
            .replaceAll(/[^\d]/g, "") ?? 0,
        installed_90d:
          installs90d?.formulae?.[formula.full_name]?.[0]?.count
            ?.toString()
            .replaceAll(/[^\d]/g, "") ?? 0,
        installed_365d:
          installs365d?.formulae?.[formula.full_name]?.[0]?.count
            ?.toString()
            .replaceAll(/[^\d]/g, "") ?? 0,

        json: JSON.stringify(formula),
      }))
    );

    if (formulaNamesToUpdate) {
      deleteRecords(
        cacheDB(),
        "formulae",
        formulaNamesToUpdate
          .map((formulaName) => {
            const formulaInfo: any = brew.info(formulaName);
            if (!formulaInfo) return null; // Not in DB anyway
            if (formulaInfo?.installed) return null; // Still installed

            return formulaInfo.rowid; // Delete from DB
          })
          .filter((x) => x)
      );
    }
  },

  async search(searchString, sortBy, filterBy, limit, offset) {
    const keywords = searchString.split(/\s+/);

    return cacheDB()
      .prepare(
        sql`
        SELECT
          formulae.json,
          formulae.installed_30d,
          formulae.installed_90d,
          formulae.installed_365d
        FROM formulae
        WHERE
          (${keywords
            .map(
              (keyword, index) => sql`
                (formulae.full_name LIKE $pattern${index}
                  OR formulae.desc LIKE $pattern${index})`
            )
            .join(sql` AND `)})
          ${(() => {
            switch (filterBy) {
              case "all":
                return "";
              case "available":
                return sql`AND formulae.installed IS NULL`;
              case "installed":
                return sql`AND formulae.installed IS NOT NULL`;
              case "updates":
                return sql`AND formulae.outdated`;
            }
          })()}
        ORDER BY formulae.${dbKeyForSortKey(sortBy)} DESC
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

  async info(formulaName: string): Promise<BrewPackageInfo> {
    const row = cacheDB()
      .prepare(
        sql`
        SELECT
          formulae.json,
          formulae.installed_30d,
          formulae.installed_90d,
          formulae.installed_365d
        FROM formulae
        WHERE
          formulae.full_name = $formulaName
        LIMIT 1
      `
      )
      .bind({
        formulaName,
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

  async install(formulaName: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const callbackID = terminal.onReceive((data) => {
        if (data.match(/^Password:/im)) {
          taskQueue.push(
            {
              type: "prompt-for-password",
              label: `Authenticate to install ${formulaName}`,
              prompt: `The installer for '${formulaName}' requires elevated privileges.\n\nEnter your password to allow this.`,
            } as PromptForPasswordTask,
            ["before"]
          );
        }
        if (
          data.match(
            new RegExp(
              `${formulaName} .*? is already installed and up-to-date`,
              "i"
            )
          )
        ) {
          terminal.offReceive(callbackID);
          return resolve(false);
        }
        if (data.match(/(?<!')-- openstore-succeeded: formula-install --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/(?<!')-- openstore-failed: formula-install --/)) {
          terminal.offReceive(callbackID);
          return resolve(false);
        }
      });

      terminal.send(
        quote([
          await getBrewExecutablePath(),
          "install",
          "--formula",
          formulaName,
        ]) +
          " && echo '-- openstore-succeeded: formula-install --' || echo '-- openstore-failed: formula-install --'\n"
      );
    });
  },

  async upgrade(formulaName: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const callbackID = terminal.onReceive((data) => {
        if (data.match(/^Password:/im)) {
          taskQueue.push(
            {
              type: "prompt-for-password",
              label: `Authenticate to update ${formulaName}`,
              prompt: `The updater for '${formulaName}' requires elevated privileges.\n\nEnter your password to allow this.`,
            } as PromptForPasswordTask,
            ["before"]
          );
        }
        if (data.match(/(?<!')-- openstore-succeeded: formula-upgrade --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/(?<!')-- openstore-failed: formula-upgrade --/)) {
          terminal.offReceive(callbackID);
          return resolve(false);
        }
      });

      terminal.send(
        quote([
          await getBrewExecutablePath(),
          "upgrade",
          "--formula",
          formulaName,
        ]) +
          " && echo '-- openstore-succeeded: formula-upgrade --' || echo '-- openstore-failed: formula-upgrade --'\n"
      );
    });
  },

  async uninstall(formulaName: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const callbackID = terminal.onReceive((data) => {
        if (data.match(/^Password:/im)) {
          taskQueue.push(
            {
              type: "prompt-for-password",
              label: `Authenticate to uninstall ${formulaName}`,
              prompt: `The uninstaller for '${formulaName}' requires elevated privileges.\n\nEnter your password to allow this.`,
            } as PromptForPasswordTask,
            ["before"]
          );
        }
        if (data.match(/(?<!')-- openstore-succeeded: formula-uninstall --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/(?<!')-- openstore-failed: formula-uninstall --/)) {
          terminal.offReceive(callbackID);
          return resolve(false);
        }
      });

      terminal.send(
        quote([
          await getBrewExecutablePath(),
          "uninstall",
          "--formula",
          formulaName,
        ]) +
          " && echo '-- openstore-succeeded: formula-uninstall --' || echo '-- openstore-failed: formula-uninstall --'\n"
      );
    });
  },

  async reindexSourceRepositories(): Promise<void> {
    (await (async () => {
      const brewProcess = spawn(await getBrewExecutablePath(), [
        "tap-info",
        "--installed",
        "--json=v1",
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

          await (brew as any)._rebuildSourceRepositoryIndexFromTapInfo(
            JSON.parse(json)
          );
          resolve();
        });
        brewProcess.on("error", reject);
      });
    })()) as void;

    indexListeners.forEach((listener) => listener());
    indexListeners.clear();
  },

  async _rebuildSourceRepositoryIndexFromTapInfo(taps: any[]) {
    console.log("indexing taps");

    const db = cacheDB();

    const brewSourceRepositories = db
      .prepare(
        sql`
          SELECT rowid
          FROM source_repositories
          WHERE source_repositories.package_manager = 'brew'
        `
      )
      .all();
    deleteRecords(
      db,
      "source_repositories",
      brewSourceRepositories.map(({ rowid }) => rowid)
    );

    insertOrReplaceRecords(
      db,
      "source_repositories",
      ["package_manager", "name", "url"],
      taps.map(({ name, remote }) => ({
        package_manager: "brew",
        name,
        url: remote,
      }))
    );
  },

  async addSourceRepository(name: string, url: string): Promise<boolean> {
    const success = await new Promise<boolean>(async (resolve, reject) => {
      const callbackID = terminal.onReceive((data) => {
        if (data.match(/(?<!')-- openstore-succeeded: tap --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/(?<!')-- openstore-failed: tap --/)) {
          terminal.offReceive(callbackID);
          return resolve(false);
        }
      });

      terminal.send(
        quote([await getBrewExecutablePath(), "tap", name, url]) +
          " && echo '-- openstore-succeeded: tap --' || echo '-- openstore-failed: tap --'\n"
      );
    });

    brew.reindexSourceRepositories();

    return success;
  },

  async removeSourceRepository(name: string): Promise<boolean> {
    const success = await new Promise<boolean>(async (resolve, reject) => {
      const callbackID = terminal.onReceive((data) => {
        if (data.match(/(?<!')-- openstore-succeeded: untap --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/(?<!')-- openstore-failed: untap --/)) {
          terminal.offReceive(callbackID);
          return resolve(false);
        }
      });

      terminal.send(
        quote([await getBrewExecutablePath(), "untap", name]) +
          " && echo '-- openstore-succeeded: untap --' || echo '-- openstore-failed: untap --'\n"
      );
    });

    brew.reindexSourceRepositories();

    return success;
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

export default brew;
