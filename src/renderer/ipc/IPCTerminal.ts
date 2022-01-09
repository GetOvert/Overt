declare global {
  interface Window {
    terminal: IPCTerminal;
  }
}

export interface IPCTerminal {
  send(data: string): void;
  onReceive(callback: (data: string) => void): number;
  offReceive(callbackID: number): void;
}
