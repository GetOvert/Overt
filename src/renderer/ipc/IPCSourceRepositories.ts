import { SourceRepository } from "package-manager/SourceRepository";

declare global {
  interface Window {
    sourceRepositories: IPCSourceRepositories;
  }
}

export interface IPCSourceRepositories {
  all(): Promise<SourceRepository[]>;
}
