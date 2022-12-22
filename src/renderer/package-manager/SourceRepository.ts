export type SourceRepository = {
  packageManager: SourceRepositoryPackageManager;
  name: string;
  url?: string | null;
};

export type SourceRepositoryChange = {
  action: "add" | "remove";
  sourceRepository: SourceRepository;
};

export const sourceRepositoryPackageMangers = ["brew"] as const;
export type SourceRepositoryPackageManager =
  typeof sourceRepositoryPackageMangers[number];
