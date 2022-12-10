import { Broadcast, BroadcastIdentity } from "../../shared/Broadcast";

declare global {
  interface Window {
    broadcasts: IPCBroadcasts;
  }
}

export interface IPCBroadcasts {
  fetchNew(): Promise<Broadcast[]>;
  markAsSeen(broadcast: BroadcastIdentity): Promise<void>;
}
