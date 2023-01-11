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
  SortKey,
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

        "official_name" TEXT, -- Full user-facing name, copied from executable's file description
        "publisher" TEXT, -- Publisher / copyright holder, as parsed from executable's copyright string
        "updated" TIMESTAMP, -- Last time the app manifest was updated
        "added" TIMESTAMP, -- Time the app manifest was added to Scoop

        "manifest_json" TEXT,
        "export_json" TEXT,

        "outdated" BOOLEAN
      )`
  );
}

let indexListeners = new Set<() => void>();

export type ScoopUpdateTimes = {
  app: {
    [fullName: string]: number;
  };
};

export type ScoopUpdateTimesResponse = {
  commit: string;
  by_name: ScoopUpdateTimes;
};

type ScoopArtifactMeta = {
  app: {
    [fullToken: string]: {
      official_name: string;
      product_name: string;
      copyright: string;
      trademarks: string;
      publisher: string;
    };
  };
};

type ScoopArtifactMetaResponse = {
  commit: string;
  by_name: ScoopArtifactMeta;
};

type ScoopAuxMetadata = {
  artifactMeta?: ScoopArtifactMeta;
  updateTimes?: ScoopUpdateTimes;
};

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
            manifestFilenames
              .filter((name) => name.endsWith(".json"))
              .map(async (manifestFilename): Promise<ScoopPackageInfo> => {
                const name = basename(manifestFilename, ".json");
                const manifest = await catchErrors(async () =>
                  JSON.parse(
                    await readFile(path.join(manifestsDir, manifestFilename), {
                      encoding: "utf-8",
                    })
                  )
                );
                const installed = installedAppsByName[name];

                return {
                  name,
                  bucket,
                  manifest,
                  installed,
                };
              })
          );
        })
      )
    ).flat(1);

    (scoop as any)._ingestAppInfo(
      newPackageInfos,
      await (scoop as any)._fetchAuxMetadata()
    );

    (scoop as any)._postIndexing();
    cacheDB_updateLastFullIndexJsTimestamp();
  },

  async indexOutdated(): Promise<void> {
    // FIXME: Implement
  },

  async indexSpecific(packageNames: string[]): Promise<void> {
    if (packageNames.length === 0) return;

    const export_: ScoopExport = JSON.parse(
      await runBackgroundScoopProcess(["export"])
    );
    const installedAppsByName = Object.fromEntries(
      export_.apps.map((app) => [app.Name, app])
    );

    const newPackageInfos: (ScoopPackageInfo | undefined)[] = await Promise.all(
      packageNames.map(async (name) => {
        const installed = installedAppsByName[name];
        if (!installed) return undefined;

        const bucket = installed.Source;
        if (!bucket) {
          // App has "Install failed" status
          return undefined;
        }

        const manifest = await catchErrors(async () =>
          JSON.parse(
            await readFile(await getScoopAppManifestPath(bucket, name), {
              encoding: "utf-8",
            })
          )
        );

        return {
          name,
          bucket,
          manifest,
          installed,
        };
      })
    );
    if (newPackageInfos.some((x) => !x)) {
      // Not installed, so we don't know which bucket this app is supposed to be from
      // An easy solution is to just reindex everything in this case,
      // which is kind of quick for Scoop anyway
      // FIXME: Do this properly to improve speed & reliability
      return await scoop.indexAll();
    }

    (scoop as any)._ingestAppInfo(
      newPackageInfos,
      await (scoop as any)._fetchAuxMetadata(),
      { deleteIfUnavailable: packageNames }
    );

    (scoop as any)._postIndexing();
  },

  async _fetchAuxMetadata(): Promise<ScoopAuxMetadata> {
    const [artifactMeta, updateTimes] = await Promise.all([
      fetchArtifactMeta(),
      fetchUpdateTimes(),
    ]);
    return { artifactMeta, updateTimes };
  },

  _postIndexing(): void {
    indexListeners.forEach((listener) => listener());
    indexListeners.clear();
  },

  async _ingestAppInfo(
    apps: ScoopPackageInfo[],
    { artifactMeta, updateTimes }: ScoopAuxMetadata,
    {
      deleteIfUnavailable,
    }: {
      deleteIfUnavailable?: string[];
    } = {}
  ) {
    function scaleTimestamp(timestamp: number | undefined) {
      return timestamp ? 1000 * timestamp : timestamp;
    }

    insertOrReplaceRecords(
      cacheDB(),
      "scoop_apps",
      [
        "id",
        "name",
        "bucket",

        "description",

        "official_name",
        "publisher",
        "updated",

        "manifest_json",
        "export_json",
      ],
      apps
        // Ensure NOT NULL constraints will be satisfied
        .filter((app) => app.name && app.bucket)
        .map((app) => ({
          id: `${app.bucket}/${app.name}`,
          name: app.name,
          bucket: app.bucket,

          description: app.manifest?.description,

          official_name:
            artifactMeta?.app?.[`${app.bucket}/${app.name}`]?.official_name,
          publisher:
            artifactMeta?.app?.[`${app.bucket}/${app.name}`]?.publisher,
          updated: scaleTimestamp(updateTimes?.app?.[app.name]),

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
          scoop_apps.name,
          scoop_apps.bucket,

          scoop_apps.official_name,
          scoop_apps.publisher,
          scoop_apps.updated,

          scoop_apps.manifest_json,
          scoop_apps.export_json
        FROM scoop_apps
        WHERE
          (${keywords
            .map(
              (keyword, index) => sql`
                (scoop_apps.id LIKE $pattern${index}
                  OR scoop_apps.official_name LIKE $pattern${index}
                  OR scoop_apps.description LIKE $pattern${index})
                  OR scoop_apps.publisher LIKE $pattern${index}`
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
        ORDER BY scoop_apps.${dbKeyForSortKey(sortBy)} DESC
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
        rowid: row.rowid,

        name: row.name,
        bucket: row.bucket,

        official_name: row.official_name,
        publisher: row.publisher,
        updated: row.updated,

        manifest: JSON.parse(row.manifest_json),
        installed: JSON.parse(row.export_json),
      }));
  },

  info(packageName: string): ScoopPackageInfo | null {
    const row = cacheDB()
      .prepare(
        sql`
        SELECT
          scoop_apps.name,
          scoop_apps.bucket,

          scoop_apps.official_name,
          scoop_apps.publisher,
          scoop_apps.updated,

          scoop_apps.manifest_json,
          scoop_apps.export_json
        FROM scoop_apps
        WHERE
          scoop_apps.id = $packageName OR
          scoop_apps.name = $packageName
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

      official_name: row.official_name,
      publisher: row.publisher,
      updated: row.updated,

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
        (await getScoopExecutablePath()) +
          " " +
          quote([
            "install",
            packageName,
            ...scoopCommonArguments(),
            ...scoopInstallationCommandArguments(),
          ]) +
          '; if ($?) { echo "-`- overt-succeeded: scoop-install -`-" } else { echo "-`- overt-failed: scoop-install -`-" }\r\n'
      );
    });
  },

  async upgrade(packageName: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const callbackID = terminal.onReceive((data) => {
        if (data.match(/-- overt-succeeded: scoop-upgrade --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/-- overt-failed: scoop-upgrade --/)) {
          terminal.offReceive(callbackID);
          return resolve(false);
        }
      });

      terminal.send(
        (await getScoopExecutablePath()) +
          " " +
          quote([
            "update",
            packageName,
            ...scoopCommonArguments(),
            ...scoopInstallationCommandArguments(),
          ]) +
          '; if ($?) { echo "-`- overt-succeeded: scoop-upgrade -`-" } else { echo "-`- overt-failed: scoop-upgrade -`-" }\r\n'
      );
    });
  },

  async uninstall(packageName: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const callbackID = terminal.onReceive((data) => {
        if (data.match(/-- overt-succeeded: scoop-uninstall --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/-- overt-failed: scoop-uninstall --/)) {
          terminal.offReceive(callbackID);
          return resolve(false);
        }
      });

      terminal.send(
        (await getScoopExecutablePath()) +
          " " +
          quote(["uninstall", packageName]) +
          '; if ($?) { echo "-`- overt-succeeded: scoop-uninstall -`-" } else { echo "-`- overt-failed: scoop-uninstall -`-" }\r\n'
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

async function catchErrors<Result>(
  block: () => Promise<Result>
): Promise<Result | undefined> {
  try {
    return await block();
  } catch (error) {
    console.error(error);
  }
}

function scoopCommonArguments(): string[] {
  return [];
}

function scoopInstallationCommandArguments(): string[] {
  return [];
}

function dbKeyForSortKey(sortKey: SortKey): string {
  switch (sortKey) {
    case "updated":
      return "updated";
    case "added":
    default:
      return "added";
  }
}

async function fetchArtifactMeta(): Promise<ScoopArtifactMeta> {
  const responses: ScoopArtifactMetaResponse[] =
    await fetchFromCloudStorageForAllBuckets("artifact-meta.json");

  return {
    app: Object.assign({}, ...responses.map(({ by_name }) => by_name?.app)),
  };
}

export async function fetchUpdateTimes(): Promise<ScoopUpdateTimes> {
  const responses: ScoopUpdateTimesResponse[] =
    await fetchFromCloudStorageForAllBuckets("update-times.json");

  return {
    app: Object.assign({}, ...responses.map(({ by_name }) => by_name?.app)),
  };
}

async function fetchFromCloudStorageForAllBuckets<ResponseBody extends object>(
  fileName: string
): Promise<ResponseBody[]> {
  const export_: ScoopExport = JSON.parse(
    await runBackgroundScoopProcess(["export"])
  );
  const bucketNames = export_.buckets.map(({ Name }) => Name);

  return (
    await Promise.all(
      bucketNames.map(async (name) => {
        const res = await fetch(
          `https://storage.googleapis.com/storage.getovert.app/scoop/${name}/${fileName}`
        );
        if (!res.ok) return null;

        return await res.json();
      })
    )
  ).filter((x) => x);
}

async function runBackgroundScoopProcess(args: string[]): Promise<string> {
  return await runBackgroundProcess("powershell.exe", [
    await getScoopExecutablePath(),
    ...args,
  ]);
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
