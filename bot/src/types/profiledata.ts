export interface ProfileData {
  identity: {
    username: string;
    avatarUrl: string;
    title: string;
    level: number;
    createdAt: Date;
    lastActive: Date;
  };
  stats: {
    hp: { current: number; max: number };
    def: number;
  };
  progression: {
    xp: { current: number; max: number };
    rank: string;
    serverRank: number;
  };
  showcase?: {
    type: 'character' | 'item' | 'achievement';
    imageUrl?: string;
    name?: string;
  };
}
export function createProfile(
  username: string,
  avatarUrl: string
): ProfileData {
  return {
    identity: {
      username,
      avatarUrl,
      title: 'Novice',
      level: 1,
      createdAt: new Date('2024-01-15'),
      lastActive: new Date(),
    },
    stats: {
      hp: { current: 100, max: 100 },
      def: 45,
    },
    progression: {
      xp: { current: 0, max: 1000 },
      rank: 'Novice',
      serverRank: 1337,
    },
  };
}
