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
import terminal from "../terminal";
import path from "path";
import {
  IPCWinget,
  WingetPackageInfo,
} from "ipc/package-managers/Windows/IPCWinget";
import { downloadWingetManifests } from "./winget-to-json/download";
import { extractWingetManifests } from "./winget-to-json/extract";

// TODO: Make user-configurable?
const rebuildIndexAfterSeconds = 60 * 60 * 24; // 1 day

if (process.platform === "win32") {
  cacheDB_addSchema(
    sql`
      CREATE TABLE IF NOT EXISTS "winget_packages" (
        "name" TEXT NOT NULL COLLATE NOCASE,
        "id" TEXT COLLATE NOCASE PRIMARY KEY,
        "version" TEXT NOT NULL,
        "desc" TEXT COLLATE NOCASE PRIMARY KEY,
        "json" TEXT NOT NULL,
        "installed_version" TEXT,
      )`
  );
}

let indexListeners = new Set<() => void>();

const winget = {
  addIndexListener(listener: () => void) {
    indexListeners.add(listener);
  },

  async reindexOutdated() {
    const wingetProcess = spawn(await getWingetExecutablePath(), [
      "upgrade",
      ...wingetCommonArguments(),
      ...wingetInstallationCommandArguments(),
    ]);

    let stdout = "";
    let stderr = "";
    wingetProcess.stdout.on("data", (data) => {
      stdout += data;
    });
    wingetProcess.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
      stderr += data;
    });

    return new Promise((resolve, reject) => {
      wingetProcess.on("exit", async (code) => {
        await winget.updateIndex(stdout.split(/\s+/).filter((s) => s));
        resolve();
      });
      wingetProcess.on("error", reject);
    });
  },

  async rebuildIndex(condition, wipeIndexFirst) {
    if (!condition) condition = "always";

    let indexExists = false;
    try {
      indexExists =
        (await cacheDB())
          .prepare(sql`SELECT "rowid" FROM "winget_packages" LIMIT 1`)
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
      if (wipeIndexFirst) deleteAllRecords(await cacheDB(), "winget_packages");
      await winget.updateIndex();
    }
  },

  async updateIndex(packageNames?: string[]): Promise<void> {
    if (Array.isArray(packageNames) && packageNames.length === 0) return;

    // TODO: Parameterize URL
    const manifestsPath = await downloadWingetManifests(
      "https://github.com/microsoft/winget-pkgs/archive/master.zip"
    );
    const manifests = extractWingetManifests(manifestsPath);

    (winget as any)._rebuildIndexFromPackageInfo(packageNames, manifests);

    indexListeners.forEach((listener) => listener());
    indexListeners.clear();
  },

  async _rebuildIndexFromPackageInfo(
    packageNamesToUpdate: string[] | undefined,
    packages: WingetPackageInfo[]
  ) {
    console.log(
      "updating packages: " +
        (Array.isArray(packageNamesToUpdate)
          ? packageNamesToUpdate.join(", ")
          : "all")
    );
    insertOrReplaceRecords(
      await cacheDB(),
      "winget_packages",
      ["name", "id", "version", "json", "installed_version"],
      packages.map((package_) => ({
        name: package_.PackageName,
        id: package_.PackageIdentifier,
        version: package_.PackageVersion,

        json: JSON.stringify(package_),

        installed_version: package_.installedVersion,
      }))
    );

    if (packageNamesToUpdate) {
      deleteRecords(
        await cacheDB(),
        "winget_packages",
        packageNamesToUpdate
          .map((packageName) => {
            const packageInfo: any = winget.info(packageName);
            if (!packageInfo) return null; // Not in DB anyway
            if (packageInfo?.installed) return null; // Still installed

            return packageInfo.rowid; // Delete from DB
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
          winget_packages.json,
        FROM winget_packages
        WHERE
          (${keywords
            .map(
              (keyword, index) => sql`
                (winget_packages.id LIKE $pattern${index}
                  OR winget_packages.name LIKE $pattern${index})
                  OR winget_packages.desc LIKE $pattern${index})`
            )
            .join(sql` AND `)})
          ${(() => {
            switch (filterBy) {
              case "all":
                return "";
              case "available":
                return sql`AND winget_packages.installedVersion IS NULL`;
              case "installed":
                return sql`AND winget_packages.installedVersion IS NOT NULL`;
              case "updates":
                return sql`
                  AND winget_packages.installedVersion IS NOT NULL
                  AND winget_packages.installedVersion != winget_packages.PackageVersion
                `;
            }
          })()}
        ORDER BY winget_packages.id DESC
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

  async info(packageName) {
    const row = (await cacheDB())
      .prepare(
        sql`
        SELECT
          winget_packages.json,
        FROM winget_packages
        WHERE
          winget_packages.id = $packageName
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
      ...JSON.parse(row.json),
    };
  },

  async install(packageName) {
    return new Promise(async (resolve, reject) => {
      const callbackID = terminal.onReceive((data) => {
        if (data.match(/(?<!')-- openstore-succeeded: winget-install --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/(?<!')-- openstore-failed: winget-install --/)) {
          terminal.offReceive(callbackID);
          return resolve(false);
        }
      });

      terminal.send(
        quote([
          await getWingetExecutablePath(),
          "install",
          packageName,
          ...wingetCommonArguments(),
          ...wingetInstallationCommandArguments(),
        ]) +
          "; if ($?) { echo '-- openstore-succeeded: winget-install --' } else { echo '-- openstore-failed: winget-install --' }\n"
      );
    });
  },

  async upgrade(packageName) {
    return new Promise(async (resolve, reject) => {
      const callbackID = terminal.onReceive((data) => {
        if (data.match(/(?<!')-- openstore-succeeded: winget-upgrade --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/(?<!')-- openstore-failed: winget-upgrade --/)) {
          terminal.offReceive(callbackID);
          return resolve(false);
        }
      });

      terminal.send(
        quote([
          await getWingetExecutablePath(),
          "upgrade",
          packageName,
          ...wingetCommonArguments(),
          ...wingetInstallationCommandArguments(),
        ]) +
          "; if ($?) { echo '-- openstore-succeeded: winget-upgrade --' } else { echo '-- openstore-failed: winget-upgrade --' }\n"
      );
    });
  },

  async uninstall(packageName) {
    return new Promise(async (resolve, reject) => {
      const callbackID = terminal.onReceive((data) => {
        if (data.match(/(?<!')-- openstore-succeeded: winget-uninstall --/)) {
          terminal.offReceive(callbackID);
          return resolve(true);
        }
        if (data.match(/(?<!')-- openstore-failed: winget-uninstall --/)) {
          terminal.offReceive(callbackID);
          return resolve(false);
        }
      });

      terminal.send(
        quote([await getWingetExecutablePath(), "uninstall", packageName]) +
          "; if ($?) { echo '-- openstore-succeeded: winget-uninstall --' } else { echo '-- openstore-failed: winget-uninstall --' }\n"
      );
    });
  },
} as IPCWinget;

function wingetCommonArguments(): string[] {
  return ["--accept-source-agreements"];
}

function wingetInstallationCommandArguments(): string[] {
  return ["--id", "--exact", "--accept-package-agreements"];
}

export async function getWingetExecutablePath(): Promise<string> {
  return path.join(
    process.env.LOCALAPPDATA,
    "Microsoft",
    "WindowsApps",
    "winget.exe"
  );
}

export default winget;
