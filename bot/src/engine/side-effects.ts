import type { StoryNode } from './types.js';
import type { MultiplayerSession } from '../types/party.js';
import { getSession, getPartyRole } from '../quickstart/runtime-graph.js';
import { getPartyByPlayer } from '../quickstart/party-session.js';
import { getPlayerArc, getArcPlayers } from './arc-manager.js';
import { client } from '../index.js';

export async function executeSideEffects(
  node: StoryNode,
  playerId: string,
  party?: MultiplayerSession | null
): Promise<void> {
  const sideEffects = node.side_effects_on_enter;
  if (!sideEffects) {
    return;
  }

  if (sideEffects.spawn_dm_jobs && node.type_specific?.dm_deliveries) {
    await sendDMDeliveries(node, playerId, party);
  }

  if (sideEffects.run_script) {
    await runScript(sideEffects.run_script, node, playerId, party);
  }
}

async function sendDMDeliveries(
  node: StoryNode,
  playerId: string,
  party?: MultiplayerSession | null
): Promise<void> {
  const dmDeliveries = node.type_specific?.dm_deliveries;
  if (!dmDeliveries || dmDeliveries.length === 0) {
    return;
  }

  if (!party) {
    party = getPartyByPlayer(playerId);
  }

  const session = getSession(playerId);
  if (!session) {
    return;
  }

  // Get arc context for the triggering player
  const arcContext = node.type_specific?.arc_context;
  const arcId = arcContext?.arc_id;

  for (const delivery of dmDeliveries) {
    const recipientRole = delivery.recipient_role;
    const recipients = findPlayersWithRole(recipientRole, playerId, party, arcId);

    for (const recipientId of recipients) {
      try {
        const user = await client.users.fetch(recipientId);
        await user.send(delivery.content.text);
      } catch (error) {
        console.error(`Failed to send DM to ${recipientId}:`, error);
      }
    }
  }
}

/**
 * Find players with a specific role.
 * If arcId is provided, only search within that arc's players.
 */
function findPlayersWithRole(
  role: string,
  currentPlayerId: string,
  party?: MultiplayerSession | null,
  arcId?: string
): string[] {
  const recipients: string[] = [];

  if (!party || party.status !== 'active') {
    // Solo player
    const playerRole = getPartyRole(currentPlayerId);
    if (playerRole === role) {
      recipients.push(currentPlayerId);
    }
    return recipients;
  }

  // Determine which players to search
  let playerPool: string[];
  
  if (arcId) {
    // Arc-scoped: only search within the arc
    playerPool = getArcPlayers(party.id, arcId);
  } else {
    // Party-wide: search all party members
    playerPool = party.players.map(p => p.odId);
  }

  for (const playerId of playerPool) {
    const playerRole = getPartyRole(playerId);
    if (playerRole === role) {
      recipients.push(playerId);
    }
  }

  return recipients;
}

async function runScript(
  scriptName: string,
  node: StoryNode,
  playerId: string,
  party?: MultiplayerSession | null
): Promise<void> {
  const session = getSession(playerId);
  if (!session) {
    return;
  }

  switch (scriptName) {
    default:
      console.warn(`Unknown script: ${scriptName}`);
      break;
  }
}
