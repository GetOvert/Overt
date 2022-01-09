declare global {
  interface Window {
    openExternalLink: IPCOpenExternalLink;
  }
}

export interface IPCOpenExternalLink {
  open(url: string): void;
}
