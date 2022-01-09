import { IPCTheme } from "ipc/IPCTheme";

// Passed in webPreferences.additionalArguments:
const accentColor = process.argv
  .filter((arg) => arg.includes("OpenStore.accentColor="))[0]
  .slice("OpenStore.accentColor=".length);

export default {
  getAccentColor(): string {
    return `#${accentColor}`;
  },
} as IPCTheme;
