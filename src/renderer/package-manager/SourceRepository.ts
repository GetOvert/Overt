export default class SourceRepository {
  packageManager: PackageManager;
  name: string;
  url: string;
}

export const packageMangers = ["brew"] as const;
export type PackageManager = typeof packageMangers[number];
