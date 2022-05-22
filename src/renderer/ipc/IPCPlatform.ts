declare global {
  interface Window {
    platform: IPCPlatform;
  }
}

export interface IPCPlatform {
  getNodePlatformString(): string;
}
