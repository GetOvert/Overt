import { IPCTheme } from "ipc/IPCTheme";

// Passed in webPreferences.additionalArguments:
const accentColor = process.argv
  .filter((arg) => arg.includes("Overt.accentColor="))[0]
  .slice("Overt.accentColor=".length);

export default {
  getAccentColor(): string {
    return `#${accentColor}`;
  },
} as IPCTheme;
