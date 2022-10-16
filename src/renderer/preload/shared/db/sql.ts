import { Database } from "better-sqlite3";

// Install a VS Code extension and use this template literal tag to get syntax highlighting for inline SQL.
// https://stackoverflow.com/questions/59643297/how-to-syntax-highlight-autocomplete-autoformat-sql-command-inside-javascript
export function sql(strings: TemplateStringsArray, ...exprs: any[]) {
  return strings
    .map(
      (str, index) => str + (exprs.length > index ? String(exprs[index]) : "")
    )
    .join("");
}

export function insertOrReplaceRecords(
  db: Database,
  table: string,
  columns: string[],
  records: object[]
) {
  const columnIdentifiers = columns.map((column) => new SQLIdentifier(column));
  const insertStatement = db.prepare(sql`
    INSERT OR REPLACE
    INTO ${new SQLIdentifier(table)} (
      ${columnIdentifiers.join(",")}
    )
    VALUES (
      ${columnIdentifiers.map((column) => "$" + column.sanitizedName).join(",")}
    )
  `);

  for (const record of records) insertStatement.run(record);
}

export function deleteRecords(
  db: Database,
  table: string,
  recordIDs: any[],
  idColumn: string = "rowid"
) {
  const deleteStatement = db.prepare(sql`
    DELETE
    FROM ${new SQLIdentifier(table)}
    WHERE ${new SQLIdentifier(idColumn)} IN (
      ${Array(recordIDs.length).fill("?").join(",")}
    )
  `);

  deleteStatement.run(recordIDs);
}

export function deleteAllRecords(db: Database, table: string) {
  db.prepare(sql`DELETE FROM ${new SQLIdentifier(table)}`).run();
}

export class SQLIdentifier {
  readonly sanitizedName: string;

  constructor(name: string) {
    this.sanitizedName = name.replace(/[^\w]/, "");
  }

  toString(): string {
    return `"${this.sanitizedName}"`;
  }
}
