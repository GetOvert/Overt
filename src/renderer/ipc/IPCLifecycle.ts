declare global {
  interface Window {
    lifecycle: IPCLifecycle;
  }
}

export interface IPCLifecycle {
  relaunch(): Promise<void>;
}
