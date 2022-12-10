import { PersistentStorage } from "../../shared/persistent-storage";

declare global {
  interface Window {
    persistentStorage: IPCPersistentStorage;
  }
}

export interface IPCPersistentStorage {
  get<Key extends keyof PersistentStorage>(
    key: Key
  ): Promise<PersistentStorage[Key]>;
  set<Key extends keyof PersistentStorage>(
    key: Key,
    value: PersistentStorage[Key]
  ): Promise<void>;
}
