import { accessSync, constants } from "fs";
import { PackageManagerSetup } from "../../PackageManagerSetup";

export class HomebrewSetup extends PackageManagerSetup<"homebrewPath"> {
  readonly key = "homebrewPath";

  readonly label = "Homebrew";
  readonly officialURL = "https://brew.sh";
  readonly aboutURL = "https://getovert.app/package-managers/homebrew";
  readonly installURL =
    "https://getovert.app/package-managers/homebrew#install-homebrew";

  isValid(path: string): boolean {
    try {
      accessSync(`${path}/bin/brew`, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  async locate(): Promise<string | undefined> {
    return ["/opt/homebrew", "/usr/local"].find((path) => this.isValid(path));
  }
}
