declare global {
  interface Window {
    settings: IPCSettings;
  }
}

export interface IPCSettings {
  set(key: string, value: any): Promise<void>;
  get(key: string): Promise<any>;
}
