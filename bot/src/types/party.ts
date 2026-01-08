export type PartyStatus = 'forming' | 'waiting' | 'active' | 'ended' | 'cancelled';
export type PartyPlayer = {
  odId: string;
  username: string;
  joinedAt: Date;
  isReady: boolean;
  playerSession?: string;
  role?: string;
};
export type MultiplayerSession = {
  id: string;
  name: string;
  ownerId: string;
  maxSize: number;
  players: PartyPlayer[];
  status: PartyStatus;
  storyId?: string;
  currentNodeId?: string;
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  inviteCode?: string;
};
