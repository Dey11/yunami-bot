import type { StoryNode, Preconditions } from './types.js';
import type { MultiplayerSession } from '../types/party.js';
import { getSession } from '../quickstart/runtime-graph.js';
import { getPartyByPlayer } from '../quickstart/party-session.js';

export interface PreconditionResult {
  allowed: boolean;
  reason?: string;
}

export function checkPreconditions(
  node: StoryNode,
  playerId: string,
  party?: MultiplayerSession | null
): PreconditionResult {
  const preconditions = node.preconditions;
  if (!preconditions) {
    return { allowed: true };
  }

  const session = getSession(playerId);
  if (!session) {
    return {
      allowed: false,
      reason: 'No active session found',
    };
  }

  if (
    preconditions.min_player_count !== undefined ||
    preconditions.max_player_count !== undefined
  ) {
    const playerCountResult = checkPlayerCount(preconditions, playerId, party);
    if (!playerCountResult.allowed) {
      return playerCountResult;
    }
  }

  if (preconditions.required_flags && preconditions.required_flags.length > 0) {
    const flagsResult = checkRequiredFlags(
      preconditions.required_flags,
      session.flags
    );
    if (!flagsResult.allowed) {
      return flagsResult;
    }
  }

  if (preconditions.required_items && preconditions.required_items.length > 0) {
    const itemsResult = checkRequiredItems(
      preconditions.required_items,
      session.inventory
    );
    if (!itemsResult.allowed) {
      return itemsResult;
    }
  }

  return { allowed: true };
}

function checkPlayerCount(
  preconditions: Preconditions,
  playerId: string,
  party?: MultiplayerSession | null
): PreconditionResult {
  if (!party) {
    party = getPartyByPlayer(playerId);
  }

  const playerCount =
    party && party.status === 'active' ? party.players.length : 1;

  if (
    preconditions.min_player_count !== undefined &&
    playerCount < preconditions.min_player_count
  ) {
    return {
      allowed: false,
      reason: `Requires at least ${preconditions.min_player_count} player(s), but only ${playerCount} present`,
    };
  }

  if (
    preconditions.max_player_count !== undefined &&
    playerCount > preconditions.max_player_count
  ) {
    return {
      allowed: false,
      reason: `Allows maximum ${preconditions.max_player_count} player(s), but ${playerCount} present`,
    };
  }

  return { allowed: true };
}

function checkRequiredFlags(
  requiredFlags: string[],
  sessionFlags: Record<string, boolean>
): PreconditionResult {
  const missingFlags: string[] = [];

  for (const flag of requiredFlags) {
    if (!sessionFlags[flag]) {
      missingFlags.push(flag);
    }
  }

  if (missingFlags.length > 0) {
    return {
      allowed: false,
      reason: `Missing required flags: ${missingFlags.join(', ')}`,
    };
  }

  return { allowed: true };
}

function checkRequiredItems(
  requiredItems: string[],
  inventory: string[]
): PreconditionResult {
  const missingItems: string[] = [];

  for (const item of requiredItems) {
    if (!inventory.includes(item)) {
      missingItems.push(item);
    }
  }

  if (missingItems.length > 0) {
    return {
      allowed: false,
      reason: `Missing required items: ${missingItems.join(', ')}`,
    };
  }

  return { allowed: true };
}
