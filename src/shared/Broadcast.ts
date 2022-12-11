export type BroadcastIdentity = {
  v: number;
  name: string;
};

export type Broadcast = BroadcastIdentity & {
  from?: Date;
  to?: Date;
  version?: string;

  body: string;
  url?: string;
  cta?: string;
};
