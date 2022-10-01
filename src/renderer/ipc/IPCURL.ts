declare global {
  interface Window {
    url: IPCURL;
  }
}

export interface IPCURL {
  setHandler(handler: (url: string) => void): void;
}
