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

// TODO: Make user-configurable?
const rebuildIndexAfterSeconds = 60 * 60 * 24; // 1 day

if (process.platform === "win32") {
  cacheDB_addSchema(
    sql`
      CREATE TABLE IF NOT EXISTS "winget_packages" (
        "name" TEXT NOT NULL COLLATE NOCASE,
        "id" TEXT COLLATE NOCASE PRIMARY KEY,
        "version" TEXT NOT NULL,
        "source" TEXT NOT NULL,
        "installed_version" TEXT
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
        const outdatedPackageIDs = parseWingetFields(stdout).map(
          (fields) => fields[1]
        );

        await winget.updateIndex(outdatedPackageIDs);
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

    for (const packageName of packageNames ?? [null]) {
      
    (await (async () => {
      const wingetProcess = spawn(await getWingetExecutablePath(), [
        "search",
        ...(packageName ? [packageName] : []),
        ...wingetCommonArguments(),
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
          if (code !== 0) return reject(stderr);

          // Parse winget search output:
          // Discard table headers
          // Read whitespace-separated fields on each line
          const packages = parseWingetFields(stdout).map((fields) => ({
            name: fields[0],
            id: fields[1],
            version: fields[2],
            source: fields[3],
            installed_version: null, // TODO: Parse `winget export`
          }));

          (winget as any)._rebuildIndexFromPackageInfo(packageNames, packages);
          resolve();
        });
        wingetProcess.on("error", reject);
      });
    })()) as void;
  }

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
      ["name", "id", "version", "source", "installed_version"],
      packages
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
          winget_packages.name,
          winget_packages.id,
          winget_packages.version,
          winget_packages.source,
          winget_packages.installed_version
        FROM winget_packages
        WHERE
          (${keywords
            .map(
              (keyword, index) => sql`
                (winget_packages.name LIKE $pattern${index}
                  OR winget_packages.id LIKE $pattern${index})`
            )
            .join(sql` AND `)})
          ${(() => {
            switch (filterBy) {
              case "all":
                return "";
              case "available":
                return sql`AND winget_packages.installed_version IS NULL`;
              case "installed":
                return sql`AND winget_packages.installed_version IS NOT NULL`;
              case "updates":
                return sql`
                  AND winget_packages.installed_version IS NOT NULL
                  AND winget_packages.installed_version != winget_packages.version
                `;
            }
          })()}
        ORDER BY winget_packages.id, winget_packages.source DESC
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
          winget_packages.name,
          winget_packages.id,
          winget_packages.version,
          winget_packages.source,
          winget_packages.installed_version
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

    return row;
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
          "--id",
          "--exact",

          ...wingetCommonArguments(),
          ...wingetInstallationCommandArguments(),
        ]) +
          "; if ($?) { echo '-- openstore-succeeded: winget-install --' } else { echo '-- openstore-failed: winget-install --' }\r\n"
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
          "--id",
          "--exact",
          ...wingetCommonArguments(),
          ...wingetInstallationCommandArguments(),
        ]) +
          "; if ($?) { echo '-- openstore-succeeded: winget-upgrade --' } else { echo '-- openstore-failed: winget-upgrade --' }\r\n"
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
        quote([
          await getWingetExecutablePath(),
          "uninstall",
          packageName,
          "--id",
          "--exact",
          ...wingetCommonArguments(),
          ...wingetInstallationCommandArguments(),
        ]) +
          "; if ($?) { echo '-- openstore-succeeded: winget-uninstall --' } else { echo '-- openstore-failed: winget-uninstall --' }\r\n"
      );
    });
  },
} as IPCWinget;

function parseWingetFields(stdout: string): string[][] {
  const columnIndices = calculateWingetColumnHeaderIndices(stdout);
  const r = discardWingetOutputHeader(stdout)
    .split(/\r?\n/)
    .filter((line) => line)
    .map((line) =>
      columnIndices.map((columnIndex, i) =>
        line.slice(columnIndex, columnIndices[i + 1] ?? undefined).trim()
      )
    );
  console.log(r);
  return r;
}

function calculateWingetColumnHeaderIndices(stdout: string): number[] {
  stdout = stdout.replace(/.*?(?=Name)/s, "").split(/\r?\n/, 2)[0];

  let indices = [];
  let index = 0;
  while (stdout && stdout[0] !== "\r" && stdout[0] !== "\n") {
    indices.push(index);

    // Skip header name
    while (stdout && stdout[0] !== " ") {
      stdout = stdout.slice(1);
      ++index;
    }

    // Skip following spaces
    while (stdout && stdout[0] === " ") {
      stdout = stdout.slice(1);
      ++index;
    }
  }

  return indices;
}

function discardWingetOutputHeader(stdout: string): string {
  return stdout.replace(/.*?-{5,}\s*/s, "");
}

function wingetCommonArguments(): string[] {
  return ["--accept-source-agreements"];
}

function wingetInstallationCommandArguments(): string[] {
  return ["--accept-package-agreements"];
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
