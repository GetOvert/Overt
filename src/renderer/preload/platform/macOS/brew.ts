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
  BrewPackageInfo,
  IPCBrew,
  SortKey,
} from "ipc/package-managers/macOS/IPCBrew";
import terminal from "preload/shared/terminal";
import * as taskQueue from "preload/shared/taskQueueIPC";
import { PromptForPasswordTask } from "tasks/Task";
import {
  BrewAnalyticsAll,
  BrewUpdateTimes,
  fetchUpdateTimes,
  getBrewExecutablePath,
  runBackgroundBrewProcess,
  TapInfo,
} from "./brewCask";
import { getFullIndexIntervalInSeconds } from "../shared";
import { Launchable } from "ipc/package-managers/IPCPackageManager";

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
        "added" TIMESTAMP -- Time the formula was added to Homebrew
      )`
  );
}

let indexListeners = new Set<() => void>();

const brew: IPCBrew = {
  name: "brew",

  addIndexListener(listener: () => void) {
    indexListeners.add(listener);
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
      (await getFullIndexIntervalInSeconds());

    if (
      !indexExists ||
      (condition === "if-too-old" && indexTooOld) ||
      condition === "always"
    ) {
      if (wipeIndexFirst) deleteAllRecords(cacheDB(), "formulae");
      await brew.indexAll();
    }
  },

  async indexAll(): Promise<void> {
    try {
      await runBackgroundBrewProcess(["update", "--quiet"]);
    } catch (error) {
      console.error(error);
      return await (brew as any)._indexWithoutInternet();
    }

    await Promise.all([
      (brew as any)._indexOfficial(),
      (brew as any)._indexUnofficial(),
    ]);

    (brew as any)._postIndexing();
    cacheDB_updateLastFullIndexJsTimestamp();
  },

  async indexOutdated(): Promise<void> {
    const stdout: string = await runBackgroundBrewProcess([
      "outdated",
      "--formula",
      "--greedy-latest",
    ]);

    await brew.indexSpecific(stdout.split(/\s+/).filter((s) => s));
  },

  async indexSpecific(formulaNames: string[]): Promise<void> {
    if (!formulaNames.length) return;

    const { formulae } = JSON.parse(
      await runBackgroundBrewProcess([
        "info",
        "--json=v2",
        "--formula",
        ...formulaNames,
      ])
    );

    const [analytics, updateTimes] = await Promise.all([
      (brew as any)._fetchOfficialAnalytics(),
      fetchUpdateTimes(),
    ]);

    await (brew as any)._ingestFormulaInfo(formulae, {
      analytics,
      updateTimes,
      deleteIfUnavailable: formulaNames,
    });

    (brew as any)._postIndexing();
  },

  async _indexOfficial(): Promise<void> {
    const formulaeFromAPI: BrewPackageInfo[] = await (
      await fetch("https://formulae.brew.sh/api/formula.json")
    ).json();

    // The API returns some garbage `installed` and `outdated` values,
    // so make sure those fields are cleared
    for (const formula of formulaeFromAPI) {
      formula.installed = [];
      formula.outdated = false;
    }

    const [analytics, updateTimes] = await Promise.all([
      (brew as any)._fetchOfficialAnalytics(),
      fetchUpdateTimes(),
    ]);

    await (brew as any)._ingestFormulaInfo(formulaeFromAPI, {
      analytics,
      updateTimes,
    });

    // The API response can't tell us what's installed locally,
    // so reindex installed packages as a 2nd step
    const { formulae } = JSON.parse(
      await runBackgroundBrewProcess([
        "info",
        "--json=v2",
        "--formula",
        "--installed",
      ])
    );

    await (brew as any)._ingestFormulaInfo(formulae, {
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
              `https://formulae.brew.sh/api/analytics/install-on-request/homebrew-core/${days}.json`
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

    const unofficialFormulae = unofficialTaps.flatMap(
      ({ formula_names }) => formula_names
    );

    await brew.indexSpecific(unofficialFormulae);
  },

  async _indexWithoutInternet(): Promise<void> {
    const { formulae } = JSON.parse(
      await runBackgroundBrewProcess([
        "info",
        "--json=v2",
        "--formula",
        "--eval-all",
      ])
    );

    await (brew as any)._ingestFormulaInfo(formulae);
  },

  _postIndexing(): void {
    indexListeners.forEach((listener) => listener());
    indexListeners.clear();
  },

  async _ingestFormulaInfo(
    formulae: BrewPackageInfo[],
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

    function scaleTimestamp(timestamp: number | undefined) {
      return timestamp ? 1000 * timestamp : timestamp;
    }

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
        "updated",
      ],
      formulae
        // Ensure NOT NULL constraints will be satisfied
        .filter((formula) => formula.name && formula.full_name && formula.tap)
        .map((formula) => ({
          ...formula,
          version: formula.versions.stable,
          installed: formula.installed[0]?.version,
          outdated: +formula.outdated,

          installed_30d: installed_30d?.formulae?.[
            formula.full_name
          ]?.[0]?.count
            ?.toString()
            .replaceAll(/[^\d]/g, ""),
          installed_90d: installed_90d?.formulae?.[
            formula.full_name
          ]?.[0]?.count
            ?.toString()
            .replaceAll(/[^\d]/g, ""),
          installed_365d: installed_365d?.formulae?.[
            formula.full_name
          ]?.[0]?.count
            ?.toString()
            .replaceAll(/[^\d]/g, ""),

          updated: scaleTimestamp(updateTimes?.formula?.[formula.full_name]),

          json: JSON.stringify(formula),
        }))
    );

    if (deleteIfUnavailable) {
      deleteRecords(
        cacheDB(),
        "formulae",
        deleteIfUnavailable
          .map((formulaName) => {
            const formulaInfo = brew.info(formulaName);
            if (!formulaInfo) return null; // Not in DB anyway
            if (formulaInfo?.installed) return null; // Still installed

            // Formula should be deleted from DB
            return (formulaInfo as any).rowid;
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
          formulae.json,
          formulae.installed_30d,
          formulae.installed_90d,
          formulae.installed_365d,
          formulae.updated
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

        updated: row.updated,
      }));
  },

  info(formulaName: string): BrewPackageInfo | null {
    const row = cacheDB()
      .prepare(
        sql`
        SELECT
          formulae.json,
          formulae.installed_30d,
          formulae.installed_90d,
          formulae.installed_365d,
          formulae.updated
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

      installed_30d: row.installed_30d,
      installed_90d: row.installed_90d,
      installed_365d: row.installed_365d,

      updated: row.updated,
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
        if (data.match(/(?<!')-- overt-succeeded: formula-install --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/(?<!')-- overt-failed: formula-install --/)) {
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
          " && echo '-- overt-succeeded: formula-install --' || echo '-- overt-failed: formula-install --'\n"
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
        if (data.match(/(?<!')-- overt-succeeded: formula-upgrade --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/(?<!')-- overt-failed: formula-upgrade --/)) {
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
          " && echo '-- overt-succeeded: formula-upgrade --' || echo '-- overt-failed: formula-upgrade --'\n"
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
        if (data.match(/(?<!')-- overt-succeeded: formula-uninstall --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/(?<!')-- overt-failed: formula-uninstall --/)) {
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
          " && echo '-- overt-succeeded: formula-uninstall --' || echo '-- overt-failed: formula-uninstall --'\n"
      );
    });
  },

  async indexSourceRepositories(): Promise<void> {
    const tapInfo: TapInfo[] = JSON.parse(
      await runBackgroundBrewProcess(["tap-info", "--json=v1", "--installed"])
    );

    await (brew as any)._rebuildSourceRepositoryIndexFromTapInfo(tapInfo);

    (brew as any)._postIndexing();
  },

  async _rebuildSourceRepositoryIndexFromTapInfo(taps: any[]) {
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
        if (data.match(/(?<!')-- overt-succeeded: tap --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/(?<!')-- overt-failed: tap --/)) {
          terminal.offReceive(callbackID);
          return resolve(false);
        }
      });

      terminal.send(
        quote([await getBrewExecutablePath(), "tap", name, url]) +
          " && echo '-- overt-succeeded: tap --' || echo '-- overt-failed: tap --'\n"
      );
    });

    brew.indexSourceRepositories();

    return success;
  },

  async removeSourceRepository(name: string): Promise<boolean> {
    const success = await new Promise<boolean>(async (resolve, reject) => {
      const callbackID = terminal.onReceive((data) => {
        if (data.match(/(?<!')-- overt-succeeded: untap --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/(?<!')-- overt-failed: untap --/)) {
          terminal.offReceive(callbackID);
          return resolve(false);
        }
      });

      terminal.send(
        quote([await getBrewExecutablePath(), "untap", name]) +
          " && echo '-- overt-succeeded: untap --' || echo '-- overt-failed: untap --'\n"
      );
    });

    brew.indexSourceRepositories();

    return success;
  },

  async launchables(packageInfo: BrewPackageInfo): Promise<Launchable[]> {
    return [];
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
