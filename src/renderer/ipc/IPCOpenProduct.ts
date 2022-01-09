declare global {
  interface Window {
    openProduct: IPCOpenProduct;
  }
}

export interface IPCOpenProduct {
  openApp(appName: string): Promise<void>;
}
