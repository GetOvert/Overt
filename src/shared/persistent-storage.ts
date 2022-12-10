import { BroadcastIdentity } from "./Broadcast";

export type PersistentStorage = {
  seenBroadcasts?: BroadcastIdentity[];
};
