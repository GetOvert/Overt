import { Config } from "shared/config";

declare global {
  interface Window {
    settings: IPCSettings;
  }
}

export interface IPCSettings {
  get<Key extends keyof Config>(key: Key): Promise<Config[Key]>;
  set<Key extends keyof Config>(key: Key, value: Config[Key]): Promise<void>;

  onChange(keys: (keyof Config)[], callback: () => void): void;
}
