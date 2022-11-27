import { IPCTheme } from "ipc/IPCTheme";

export default {
  // Passed in webPreferences.additionalArguments:
  accentColor:
    "#" +
    process.argv
      .filter((arg) => arg.includes("Overt.accentColor="))[0]
      .slice("Overt.accentColor=".length),
} as IPCTheme;
