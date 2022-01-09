declare global {
  interface Window {
    theme: IPCTheme;
  }
}

export interface IPCTheme {
  getAccentColor(): string;
}
