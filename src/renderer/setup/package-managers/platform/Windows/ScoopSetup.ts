import { accessSync, constants } from "fs";
import path from "path";
import { PackageManagerSetup } from "../../PackageManagerSetup";

export class ScoopSetup extends PackageManagerSetup<"scoopPath"> {
  readonly key = "scoopPath";

  readonly label = "Scoop";
  readonly officialURL = "https://scoop.sh";
  readonly aboutURL = "https://getovert.app/package-managers/scoop";
  readonly installURL =
    "https://getovert.app/package-managers/scoop#install-scoop";

  isValid(path: string): boolean {
    try {
      accessSync(`${path}/shims/scoop.ps1`, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  async locate(): Promise<string | undefined> {
    return [path.join(process.env.HOME ?? "", "scoop")].find((path) =>
      this.isValid(path)
    );
  }
}
