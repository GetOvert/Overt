import { shell } from "electron";
import { IPCOpenExternalLink } from "ipc/IPCOpenExternalLink";

export default {
  open(url: string): void {
    shell.openExternal(url);
  },
} as IPCOpenExternalLink;
