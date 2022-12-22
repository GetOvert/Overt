import { IPCSourceRepositories } from "ipc/IPCSourceRepositories";
import { SourceRepository } from "package-manager/SourceRepository";
import { sql } from "preload/shared/db/sql";
import { cacheDB, cacheDB_addSchema } from "./db/cacheDB";

cacheDB_addSchema(
  sql`
    CREATE TABLE IF NOT EXISTS "source_repositories" (
      "package_manager" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "url" TEXT
    )`
);

const sourceRepositories: IPCSourceRepositories = {
  async all(): Promise<SourceRepository[]> {
    return cacheDB()
      .prepare(
        sql`
          SELECT
            source_repositories.package_manager,
            source_repositories.name,
            source_repositories.url
          FROM source_repositories
          ORDER BY source_repositories.package_manager ASC, source_repositories.name ASC
        `
      )
      .all()
      .map(({ package_manager, name, url }) => ({
        packageManager: package_manager,
        name,
        url,
      }));
  },
};

export default sourceRepositories;
