import { IPCBroadcasts } from "ipc/IPCBroadcasts";
import { Broadcast, BroadcastIdentity } from "../../../shared/Broadcast";
import persistentStorage from "./persistentStorage";

export default {
  async fetchNew(): Promise<Broadcast[]> {
    const rawBroadcasts: any[] = await (
      await fetch(
        `https://storage.googleapis.com/storage.getovert.app/broadcasts.json`
      )
    ).json();

    const broadcasts = rawBroadcasts
      .filter(({ v }) => v === 1)
      .filter(({ name }) => name)
      .filter(({ body }) => body)
      .map(
        (broadcast: any): Broadcast => ({
          ...broadcast,
          from: broadcast.from ? new Date(1000 * broadcast.from) : undefined,
          to: broadcast.to ? new Date(1000 * broadcast.to) : undefined,
        })
      )
      .filter(({ from, to }) => {
        const nowTime = new Date().getTime();
        return from.getTime() <= nowTime && nowTime < to.getTime();
      });

    const seen = Object.fromEntries(
      ((await persistentStorage.get("seenBroadcasts")) ?? []).map(
        (broadcast) => [broadcast.name, broadcast]
      )
    );
    return broadcasts.filter(({ name }) => !seen[name]);
  },

  async markAsSeen({ v, name }) {
    const identity: BroadcastIdentity = {
      v,
      name,
    };

    await persistentStorage.set("seenBroadcasts", [
      identity,
      ...((await persistentStorage.get("seenBroadcasts")) ?? []),
    ]);
  },
} as IPCBroadcasts;
