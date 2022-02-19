import Database from "better-sqlite3";
import path from "path";
import fs, { stat } from "fs";
import { promisify } from "util";

// Passed in webPreferences.additionalArguments:
const cachePath = process.argv
  .filter((arg) => arg.includes("OpenStore.cachePath="))[0]
  .slice("OpenStore.cachePath=".length);

const cacheDir = path.join(cachePath, "OpenStore_v1");
fs.mkdirSync(cacheDir, { recursive: true });

const cacheDBPath = path.join(cacheDir, "OpenStore_Cache.db");

let allSchema: string[] = [];
export function cacheDB_addSchema(schema: string) {
  allSchema.push(schema);
}

let _cacheDB_ModifiedTimeAtLaunch: number;
export async function cacheDB_ModifiedTimeAtLaunch() {
  await cacheDB();
  return _cacheDB_ModifiedTimeAtLaunch;
}

let _cacheDB: Database.Database;
export async function cacheDB() {
  if (!_cacheDB) {
    try {
      _cacheDB_ModifiedTimeAtLaunch = (
        await promisify(stat)(cacheDBPath)
      ).mtime.getTime();
    } catch (e) {
      // Presumably the file doesn't exist
      _cacheDB_ModifiedTimeAtLaunch = new Date().getTime();
    }

    _cacheDB = new Database(cacheDBPath);

    for (const schema of allSchema) {
      _cacheDB.prepare(schema).run();
    }
  }

  return _cacheDB;
}
