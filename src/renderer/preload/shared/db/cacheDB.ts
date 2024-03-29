import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Passed in webPreferences.additionalArguments:
const cachePath = Buffer.from(
  process.argv
    .filter((arg) => arg.includes("Overt.cachePath="))[0]
    .slice("Overt.cachePath=".length),
  "base64"
).toString();

const cacheDir = path.join(cachePath, "Overt_v6");
const oldCacheDirs = [
  path.join(cachePath, "Overt_v5"),
  path.join(cachePath, "Overt_v4"),
  path.join(cachePath, "OpenStore_v3"),
  path.join(cachePath, "OpenStore_v2"),
  path.join(cachePath, "OpenStore_v1"),
];

// Try to delete older versions of cache
for (const oldCacheDir of oldCacheDirs) {
  try {
    if (fs.existsSync(oldCacheDir)) {
      console.log(`Deleting old cache dir: ${oldCacheDir}`);
      fs.rmSync(oldCacheDir, { recursive: true });
    }
  } catch (e) {
    console.error(`Couldn't delete old cache dir: ${e}`);
  }
}

// Set up cache (for current version)
fs.mkdirSync(cacheDir, { recursive: true });

const cacheDBPath = path.join(cacheDir, "Overt_Cache.db");
const cacheMetaPath = path.join(cacheDir, "Overt_Cache.json");

let allSchema: string[] = [];
export function cacheDB_addSchema(schema: string) {
  allSchema.push(schema);
}

type CacheDBMeta = {
  lastFullIndexJsTimestamp?: Record<string /* package manager key */, number>;
};

function cacheDB_loadMeta(): CacheDBMeta {
  try {
    return JSON.parse(fs.readFileSync(cacheMetaPath).toString());
  } catch (error) {
    if (error.code !== "ENOENT") console.error(error);
    return {};
  }
}
function cacheDB_saveMeta(meta: CacheDBMeta) {
  fs.writeFileSync(cacheMetaPath, JSON.stringify(meta));
}

export function cacheDB_lastFullIndexJsTimestamp(
  packageManagerKey: string
): number {
  return (
    cacheDB_loadMeta()?.lastFullIndexJsTimestamp?.[packageManagerKey] ??
    new Date().getTime()
  );
}
export function cacheDB_updateLastFullIndexJsTimestamp(
  packageManagerKey: string
): void {
  const oldMeta = cacheDB_loadMeta();
  cacheDB_saveMeta({
    ...oldMeta,
    lastFullIndexJsTimestamp: {
      ...oldMeta.lastFullIndexJsTimestamp,
      [packageManagerKey]: new Date().getTime(),
    },
  });
}

let _cacheDB: Database.Database;
export function cacheDB() {
  _cacheDB = new Database(cacheDBPath);
  _cacheDB.pragma("journal_mode = WAL");

  for (const schema of allSchema) {
    _cacheDB.prepare(schema).run();
  }

  return _cacheDB;
}
