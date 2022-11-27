import { PackageManagersConfig } from "../../../shared/config";

export abstract class PackageManagerSetup<
  Key extends keyof PackageManagersConfig = keyof PackageManagersConfig
> {
  abstract readonly key: Key;

  abstract readonly label: string;
  abstract readonly officialURL: string;
  abstract readonly aboutURL: string;
  abstract readonly installURL: string;

  abstract isValid(path: string): boolean;
  abstract locate(): Promise<string | undefined>;
}
