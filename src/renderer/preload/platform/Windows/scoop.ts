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
import terminal from "preload/shared/terminal";
import path, { basename } from "path";
import {
  IPCScoop,
  ScoopExport,
  ScoopPackageInfo,
} from "ipc/package-managers/Windows/IPCScoop";
import { getFullIndexIntervalInSeconds, runBackgroundProcess } from "../shared";
import { Launchable } from "ipc/package-managers/IPCPackageManager";
import settings from "preload/shared/settings";
import { readdir, readFile } from "fs/promises";

if (process.platform === "win32") {
  cacheDB_addSchema(
    sql`
      CREATE TABLE IF NOT EXISTS "scoop_apps" (
        "id" TEXT PRIMARY KEY COLLATE NOCASE,
        "name" TEXT NOT NULL COLLATE NOCASE,
        "bucket" TEXT NOT NULL COLLATE NOCASE,

        "description" TEXT,
        "manifest_json" TEXT,
        "export_json" TEXT,

        "outdated" BOOLEAN
      )`
  );
}

let indexListeners = new Set<() => void>();

const scoop: IPCScoop = {
  name: "scoop",

  addIndexListener(listener: () => void) {
    indexListeners.add(listener);
  },

  async rebuildIndex(condition, wipeIndexFirst) {
    if (!condition) condition = "always";

    let indexExists = false;
    try {
      indexExists =
        cacheDB()
          .prepare(sql`SELECT "rowid" FROM "scoop_apps" LIMIT 1`)
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
      if (wipeIndexFirst) deleteAllRecords(cacheDB(), "scoop_apps");
      await scoop.indexAll();
    }
  },

  async indexAll(): Promise<void> {
    const export_: ScoopExport = JSON.parse(
      await runBackgroundScoopProcess(["export"])
    );

    const bucketNames = export_.buckets.map(({ Name }) => Name);

    const installedAppsByName = Object.fromEntries(
      export_.apps.map((app) => [app.Name, app])
    );

    const newPackageInfos: ScoopPackageInfo[] = (
      await Promise.all(
        bucketNames.map(async (bucket): Promise<ScoopPackageInfo[]> => {
          const manifestsDir = path.join(
            await getScoopBucketPath(bucket),
            "bucket"
          );
          const manifestFilenames = await readdir(manifestsDir);

          return await Promise.all(
            manifestFilenames.map(
              async (manifestFilename): Promise<ScoopPackageInfo> => {
                const name = basename(manifestFilename, ".json");
                const manifest = JSON.parse(
                  await readFile(manifestFilename, { encoding: "utf-8" })
                );
                const installed = installedAppsByName[name];

                return {
                  name,
                  bucket,
                  manifest,
                  installed,
                };
              }
            )
          );
        })
      )
    ).flat(1);

    (scoop as any)._ingestPackageInfo(undefined, newPackageInfos);

    (scoop as any)._postIndexing();
    cacheDB_updateLastFullIndexJsTimestamp();
  },

  async indexOutdated(): Promise<void> {
    const stdout = await runBackgroundScoopProcess([
      "upgrade",
      ...scoopCommonArguments(),
      ...scoopInstallationCommandArguments(),
    ]);

    await scoop.indexSpecific(stdout.split(/\s+/).filter((s) => s));
  },

  async indexSpecific(packageNames: string[]): Promise<void> {
    if (packageNames.length === 0) return;

    const export_: ScoopExport = JSON.parse(
      await runBackgroundScoopProcess(["export"])
    );
    const installedAppsByName = Object.fromEntries(
      export_.apps.map((app) => [app.Name, app])
    );

    const newPackageInfos: ScoopPackageInfo[] = await Promise.all(
      packageNames.map(async (name) => {
        const installed = installedAppsByName[name];
        const bucket = installed.Source;

        const manifest = JSON.parse(
          await readFile(await getScoopAppManifestPath(bucket, name), {
            encoding: "utf-8",
          })
        );

        return {
          name,
          bucket,
          manifest,
          installed,
        };
      })
    );

    (scoop as any)._ingestPackageInfo(packageNames, newPackageInfos);

    (scoop as any)._postIndexing();
  },

  _postIndexing(): void {
    indexListeners.forEach((listener) => listener());
    indexListeners.clear();
  },

  async _ingestPackageInfo(
    packages: ScoopPackageInfo[],
    {
      deleteIfUnavailable,
    }: {
      deleteIfUnavailable?: string[];
    }
  ) {
    console.dir(packages);

    insertOrReplaceRecords(
      cacheDB(),
      "scoop_apps",
      ["id", "name", "bucket", "description", "manifest_json", "export_json"],
      packages
        // Ensure NOT NULL constraints will be satisfied
        .filter((app) => app.name && app.bucket)
        .map((app) => ({
          id: `${app.bucket}/${app.name}`,
          name: app.name,
          bucket: app.bucket,

          description: app.manifest?.description,
          manifest_json: JSON.stringify(app.manifest),
          export_json: JSON.stringify(app.installed),
        }))
    );

    if (deleteIfUnavailable) {
      deleteRecords(
        cacheDB(),
        "scoop_apps",
        deleteIfUnavailable
          .map((packageName) => {
            const packageInfo = scoop.info(packageName);
            if (!packageInfo) return null; // Not in DB anyway
            if (packageInfo?.installed) return null; // Still installed

            // Package should be deleted from DB
            return (packageInfo as any).rowid;
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
          scoop_apps.manifest_json,
          scoop_apps.export_json
        FROM scoop_apps
        WHERE
          (${keywords
            .map(
              (keyword, index) => sql`
                (scoop_apps.id LIKE $pattern${index}
                  OR scoop_apps.desc LIKE $pattern${index})`
            )
            .join(sql` AND `)})
          ${(() => {
            switch (filterBy) {
              case "all":
                return "";
              case "available":
                return sql`AND scoop_apps.export_json IS NULL`;
              case "installed":
                return sql`AND scoop_apps.export_json IS NOT NULL`;
              case "updates":
                return sql`AND scoop_apps.outdated`;
            }
          })()}
        ORDER BY scoop_apps.id DESC
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
      .all();
  },

  info(packageName: string): ScoopPackageInfo | null {
    const row = cacheDB()
      .prepare(
        sql`
        SELECT
          scoop_apps.name,
          scoop_apps.bucket,
          scoop_apps.manifest_json,
          scoop_apps.export_json,
        FROM scoop_apps
        WHERE
          scoop_apps.id = $packageName
        LIMIT 1
      `
      )
      .bind({
        packageName,
      })
      .get();
    if (!row) return null;

    return {
      rowid: row.rowid,

      name: row.name,
      bucket: row.bucket,

      manifest: JSON.parse(row.manifest_json),
      installed: JSON.parse(row.export_json),
    };
  },

  async install(packageName: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const callbackID = terminal.onReceive((data) => {
        if (data.match(/(?<!')-- overt-succeeded: scoop-install --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/(?<!')-- overt-failed: scoop-install --/)) {
          terminal.offReceive(callbackID);
          return resolve(false);
        }
      });

      terminal.send(
        quote([
          await getScoopExecutablePath(),
          "install",
          packageName,
          ...scoopCommonArguments(),
          ...scoopInstallationCommandArguments(),
        ]) +
          "; if ($?) { echo '-- overt-succeeded: scoop-install --' } else { echo '-- overt-failed: scoop-install --' }\n"
      );
    });
  },

  async upgrade(packageName: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const callbackID = terminal.onReceive((data) => {
        if (data.match(/(?<!')-- overt-succeeded: scoop-upgrade --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/(?<!')-- overt-failed: scoop-upgrade --/)) {
          terminal.offReceive(callbackID);
          return resolve(false);
        }
      });

      terminal.send(
        quote([
          await getScoopExecutablePath(),
          "update",
          packageName,
          ...scoopCommonArguments(),
          ...scoopInstallationCommandArguments(),
        ]) +
          "; if ($?) { echo '-- overt-succeeded: scoop-upgrade --' } else { echo '-- overt-failed: scoop-upgrade --' }\n"
      );
    });
  },

  async uninstall(packageName: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const callbackID = terminal.onReceive((data) => {
        if (data.match(/(?<!')-- overt-succeeded: scoop-uninstall --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/(?<!')-- overt-failed: scoop-uninstall --/)) {
          terminal.offReceive(callbackID);
          return resolve(false);
        }
      });

      terminal.send(
        quote([await getScoopExecutablePath(), "uninstall", packageName]) +
          "; if ($?) { echo '-- overt-succeeded: scoop-uninstall --' } else { echo '-- overt-failed: scoop-uninstall --' }\n"
      );
    });
  },

  async indexSourceRepositories(): Promise<void> {
    // TODO: unimplemented
    throw new Error("unimplemented");
  },

  async addSourceRepository(name: string, url: string): Promise<boolean> {
    // TODO: unimplemented
    throw new Error("unimplemented");
  },

  async removeSourceRepository(name: string): Promise<boolean> {
    // TODO: unimplemented
    throw new Error("unimplemented");
  },

  async launchables(packageInfo: ScoopPackageInfo): Promise<Launchable[]> {
    return [];
  },
};

function scoopCommonArguments(): string[] {
  return [];
}

function scoopInstallationCommandArguments(): string[] {
  return [];
}

async function runBackgroundScoopProcess(args: string[]): Promise<string> {
  return await runBackgroundProcess(await getScoopExecutablePath(), args);
}

async function getScoopExecutablePath(): Promise<string> {
  const scoopPath = await settings.get("scoopPath");
  if (!scoopPath) throw new Error("Scoop is not configured!");

  return path.join(scoopPath, "shims", "scoop.ps1");
}

async function getScoopAppManifestPath(
  bucketName: string,
  appName: string
): Promise<string> {
  return path.join(
    await getScoopBucketPath(bucketName),
    "bucket",
    `${appName}.json`
  );
}

async function getScoopBucketPath(bucketName: string): Promise<string> {
  const scoopPath = await settings.get("scoopPath");
  if (!scoopPath) throw new Error("Scoop is not configured!");

  return path.join(scoopPath, "buckets", bucketName);
}

export default scoop;
