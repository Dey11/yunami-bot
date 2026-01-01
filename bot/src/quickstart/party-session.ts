import type { MultiplayerSession } from "../types/party.js";
import { getSession, initSession } from "./runtime-graph.js";
import { storyGraph } from "./story-graph.js";

const partySessions = new Map<string, MultiplayerSession>();

function generatePartyId(): string {
  return `party_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateInviteCode(): string {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

export function createParty(
  ownerId: string,
  ownerUsername: string,
  partyName: string,
  maxSize: number
): MultiplayerSession {
  const partyId = generatePartyId();

  const party: MultiplayerSession = {
    id: partyId,
    name: partyName,
    ownerId,
    maxSize,
    players: [
      {
        odId: ownerId,
        username: ownerUsername,
        joinedAt: new Date(),
        isReady: false,
      },
    ],
    status: "waiting",
    createdAt: new Date(),
    inviteCode: generateInviteCode(),
  };

  partySessions.set(partyId, party);
  return party;
}

export function getParty(partyId: string): MultiplayerSession | undefined {
  return partySessions.get(partyId);
}

export async function getPartyByOwner(
  ownerId: string
): Promise<MultiplayerSession | undefined> {
  for (const party of partySessions.values()) {
    if (party.ownerId === ownerId && party.status === "waiting") {
      return party;
    }
  }
  return undefined;
}

export function getPartyByPlayer(
  playerId: string
): MultiplayerSession | undefined {
  for (const party of partySessions.values()) {
    if (
      party.players.some((p) => p.odId === playerId) &&
      party.status !== "ended" &&
      party.status !== "cancelled"
    ) {
      return party;
    }
  }
  return undefined;
}

export async function invitePlayerToParty(
  partyId: string,
  playerId: string,
  username: string
): Promise<{ success: boolean; message: string; party?: MultiplayerSession }> {
  const party = partySessions.get(partyId);

  if (!party) {
    return { success: false, message: "Party not found" };
  }

  if (party.status !== "waiting") {
    return { success: false, message: "Party is not accepting new members" };
  }

  if (party.players.length >= party.maxSize) {
    return { success: false, message: "Party is full" };
  }

  if (party.players.some((p) => p.odId === playerId)) {
    return { success: false, message: "Player is already in the party" };
  }

  const existingParty = getPartyByPlayer(playerId);
  if (existingParty && existingParty.id !== partyId) {
    return { success: false, message: "Player is already in another party" };
  }

  party.players.push({
    odId: playerId,
    username,
    joinedAt: new Date(),
    isReady: false,
  });

  return { success: true, message: "Player added to party", party };
}

export function removePlayerFromParty(
  partyId: string,
  playerId: string
): boolean {
  const party = partySessions.get(partyId);
  if (!party) return false;

  if (party.status === "active") {
    return false;
  }

  party.players = party.players.filter((p) => p.odId !== playerId);

  if (party.ownerId === playerId || party.players.length === 0) {
    party.status = "cancelled";
    partySessions.delete(partyId);
  }

  return true;
}

export function setPlayerReady(
  partyId: string,
  playerId: string,
  ready: boolean
): boolean {
  const party = partySessions.get(partyId);
  if (!party) return false;

  const player = party.players.find((p) => p.odId === playerId);
  if (!player) return false;

  player.isReady = ready;
  return true;
}

export function areAllPlayersReady(partyId: string): boolean {
  const party = partySessions.get(partyId);
  if (!party || party.players.length < party.maxSize) return false;

  return party.players.every((p) => p.isReady);
}

export function startPartyStory(
  partyId: string,
  storyId: string
): { success: boolean; message: string; party?: MultiplayerSession } {
  const party = partySessions.get(partyId);

  if (!party) {
    return { success: false, message: "Party not found" };
  }

  if (party.status !== "waiting") {
    return { success: false, message: "Party is not in waiting state" };
  }

  if (party.players.length < 2) {
    return { success: false, message: "Need at least 2 players to start" };
  }

  const storyData = storyGraph.getStory(storyId);
  if (!storyData) {
    return { success: false, message: "Story not found" };
  }

  party.players.forEach((player) => {
    initSession(
      player.odId,
      storyId,
      storyData.firstNodeId || storyData.entryNodeId,
      storyData
    );
    player.playerSession = player.odId;
  });

  party.status = "active";
  party.storyId = storyId;
  party.currentNodeId = storyData.firstNodeId || storyData.entryNodeId;
  party.startedAt = new Date();

  return { success: true, message: "Party story started", party };
}

export function updatePartyNode(partyId: string, nextNodeId: string): boolean {
  const party = partySessions.get(partyId);
  if (!party || party.status !== "active") return false;

  party.currentNodeId = nextNodeId;

  party.players.forEach((player) => {
    const session = getSession(player.odId);
    if (session) {
      session.currentNodeId = nextNodeId;
    }
  });

  return true;
}

export function endParty(partyId: string): MultiplayerSession | undefined {
  const party = partySessions.get(partyId);
  if (!party) return undefined;

  party.status = "ended";
  party.endedAt = new Date();

  return party;
}

export function cancelParty(partyId: string): boolean {
  const party = partySessions.get(partyId);
  if (!party || party.status !== "waiting") return false;

  party.status = "cancelled";
  partySessions.delete(partyId);
  return true;
}

export function getAllActiveParties(): MultiplayerSession[] {
  return Array.from(partySessions.values()).filter(
    (p) => p.status === "waiting" || p.status === "active"
  );
}

export function getPartyByInviteCode(
  inviteCode: string
): MultiplayerSession | undefined {
  for (const party of partySessions.values()) {
    if (party.inviteCode === inviteCode && party.status === "waiting") {
      return party;
    }
  }
  return undefined;
}

export function cleanupOldParties(maxAgeMinutes: number = 60): number {
  const now = new Date();
  let cleaned = 0;

  for (const [id, party] of partySessions.entries()) {
    if (party.status === "ended" || party.status === "cancelled") {
      const age = now.getTime() - (party.endedAt || party.createdAt).getTime();
      if (age > maxAgeMinutes * 60 * 1000) {
        partySessions.delete(id);
        cleaned++;
      }
    }
  }

  return cleaned;
}
