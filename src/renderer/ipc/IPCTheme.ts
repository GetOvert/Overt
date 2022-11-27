declare global {
  interface Window {
    theme: IPCTheme;
  }
}

export interface IPCTheme {
  readonly accentColor: string;
}
