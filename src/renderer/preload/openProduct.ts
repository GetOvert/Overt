import { spawn } from "child_process";
import { IPCOpenProduct } from "ipc/IPCOpenProduct";

export default {
  openApp(appName) {
    return new Promise((resolve, reject) => {
      const process = spawn("/usr/bin/open", ["-a", appName]);
      process.on("close", (exitCode) => {
        if (exitCode === 0) resolve();
        else reject(exitCode);
      });
    });
  },
} as IPCOpenProduct;
