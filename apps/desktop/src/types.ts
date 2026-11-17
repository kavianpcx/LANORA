export type Lang = "en" | "fa";
export type EngineStatus = {
  running: boolean;
  virtualIp: string | null;
  state: string;
  error: string | null;
};
export type Member = {
  userId: string;
  username: string;
  avatar?: string;
  role: string;
  status: string;
  virtualIp?: string;
  online?: boolean;
  peerStatus?: "unknown" | string;
};
export type PeerStatus = {
  virtualIp: string;
  latencyMs: number | null;
  routeType?: "direct" | "relay" | null;
  observedAt?: number;
};
export type ListedRoom = {
  id: string;
  name: string;
  gameName: string;
  memberCount: number;
  maxPlayers: number;
  requireApproval: boolean;
  acceptingMembers: boolean;
};
export type ActiveRoom = {
  roomId: string;
  name: string;
  accessToken: string;
  selfUserId?: string;
  inviteCode?: string;
  role: "host" | "member";
  status: string;
  members?: Member[];
  networkGeneration?: number;
};
export type Network = {
  networkName: string;
  networkSecret: string;
  peerUrl: string;
  networkGeneration?: number;
};
