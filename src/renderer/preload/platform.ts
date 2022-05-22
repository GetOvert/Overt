import { IPCPlatform } from "ipc/IPCPlatform";

export default {
  getNodePlatformString(): string {
    return `${process.platform}`;
  },
} as IPCPlatform;
