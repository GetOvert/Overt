import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Passed in webPreferences.additionalArguments:
const cachePath = process.argv
  .filter((arg) => arg.includes("OpenStore.cachePath="))[0]
  .slice("OpenStore.cachePath=".length);

const cacheDir = path.join(cachePath, "OpenStore_v1");
fs.mkdirSync(cacheDir, { recursive: true });

export const cacheDB = new Database(path.join(cacheDir, "OpenStore_Cache.db"));
