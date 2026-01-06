import type { ArcDefinition, ArcSplitConfig } from './types.js';
import { getPartyRole } from '../quickstart/runtime-graph.js';
import * as api from '../api/client.js';
export interface ActiveArc {
  arcId: string;
  arcDefinition: ArcDefinition;
  playerIds: string[];
  currentNodeId: string;
  startedAt: Date;
  status: 'active' | 'waiting_at_merge' | 'completed';
  isSoloArc: boolean;
}
export interface PartyArcState {
  partyId: string;
  activeArcs: Map<string, ActiveArc>;
  playerArcAssignment: Map<string, string>;
  mergeNodeId: string;
  arcsWaitingAtMerge: Set<string>;
  splitNodeId: string;
}
const partyArcStates = new Map<string, PartyArcState>();
export function initArcSplit(
  partyId: string,
  splitNodeId: string,
  splitConfig: ArcSplitConfig,
  players: Array<{ odId: string; role?: string }>
): PartyArcState {
  const assignments = assignPlayersToArcs(splitConfig, players);
  const activeArcs = new Map<string, ActiveArc>();
  const playerArcAssignment = new Map<string, string>();
  for (const arcDef of splitConfig.arcs) {
    const arcPlayerIds = assignments.get(arcDef.id) || [];
    if (arcPlayerIds.length > 0) {
      activeArcs.set(arcDef.id, {
        arcId: arcDef.id,
        arcDefinition: arcDef,
        playerIds: arcPlayerIds,
        currentNodeId: arcDef.entry_node_id,
        startedAt: new Date(),
        status: 'active',
        isSoloArc: arcPlayerIds.length === 1,
      });
      for (const playerId of arcPlayerIds) {
        playerArcAssignment.set(playerId, arcDef.id);
      }
    }
  }
  const state: PartyArcState = {
    partyId,
    activeArcs,
    playerArcAssignment,
    mergeNodeId: splitConfig.merge_node_id,
    arcsWaitingAtMerge: new Set(),
    splitNodeId,
  };
  partyArcStates.set(partyId, state);
  const firstPlayerId = players[0]?.odId;
  if (firstPlayerId) {
    api.initArcSplit(firstPlayerId, partyId, splitNodeId, splitConfig, players).catch((err) => {
      console.error('[arc-manager] Failed to sync arc split to server:', err);
    });
  }
  return state;
}
function assignPlayersToArcs(
  splitConfig: ArcSplitConfig,
  players: Array<{ odId: string; role?: string }>
): Map<string, string[]> {
  const assignments = new Map<string, string[]>();
  const unassignedPlayers = [...players];
  for (const arc of splitConfig.arcs) {
    assignments.set(arc.id, []);
  }
  if (splitConfig.split_mode === 'role_based') {
    for (const arc of splitConfig.arcs) {
      if (arc.required_roles && arc.required_roles.length > 0) {
        const playerCount = arc.player_count === 'remaining' 
          ? unassignedPlayers.length 
          : arc.player_count;
        for (let i = 0; i < playerCount && unassignedPlayers.length > 0; i++) {
          const matchIdx = unassignedPlayers.findIndex(p => 
            p.role && arc.required_roles!.includes(p.role)
          );
          if (matchIdx !== -1) {
            const player = unassignedPlayers.splice(matchIdx, 1)[0];
            assignments.get(arc.id)!.push(player.odId);
          }
        }
      }
    }
    for (const arc of splitConfig.arcs) {
      if (arc.preferred_roles && arc.preferred_roles.length > 0) {
        const currentCount = assignments.get(arc.id)!.length;
        const targetCount = arc.player_count === 'remaining' 
          ? unassignedPlayers.length 
          : arc.player_count;
        const needed = targetCount - currentCount;
        for (let i = 0; i < needed && unassignedPlayers.length > 0; i++) {
          const matchIdx = unassignedPlayers.findIndex(p =>
            p.role && arc.preferred_roles!.includes(p.role)
          );
          if (matchIdx !== -1) {
            const player = unassignedPlayers.splice(matchIdx, 1)[0];
            assignments.get(arc.id)!.push(player.odId);
          }
        }
      }
    }
  }
  for (const arc of splitConfig.arcs) {
    const currentCount = assignments.get(arc.id)!.length;
    const targetCount = arc.player_count === 'remaining'
      ? unassignedPlayers.length
      : arc.player_count;
    const needed = targetCount - currentCount;
    for (let i = 0; i < needed && unassignedPlayers.length > 0; i++) {
      const randomIdx = Math.floor(Math.random() * unassignedPlayers.length);
      const player = unassignedPlayers.splice(randomIdx, 1)[0];
      assignments.get(arc.id)!.push(player.odId);
    }
  }
  return assignments;
}
export function getPartyArcState(partyId: string): PartyArcState | undefined {
  return partyArcStates.get(partyId);
}
export function getPlayerArc(partyId: string | undefined, playerId: string): string | undefined {
  if (!partyId) return undefined;
  const state = partyArcStates.get(partyId);
  return state?.playerArcAssignment.get(playerId);
}
export function getArcPlayers(partyId: string, arcId: string): string[] {
  const state = partyArcStates.get(partyId);
  const arc = state?.activeArcs.get(arcId);
  return arc?.playerIds || [];
}
export function getActiveArc(partyId: string | undefined, arcId: string): ActiveArc | undefined {
  if (!partyId) return undefined;
  const state = partyArcStates.get(partyId);
  return state?.activeArcs.get(arcId);
}
export function isPlayerInSoloArc(partyId: string | undefined, playerId: string): boolean {
  if (!partyId) return true; 
  const arcId = getPlayerArc(partyId, playerId);
  if (!arcId) return true;
  const arc = getActiveArc(partyId, arcId);
  return arc?.isSoloArc ?? true;
}
export function updateArcNode(partyId: string, arcId: string, nodeId: string, playerId?: string): boolean {
  const state = partyArcStates.get(partyId);
  const arc = state?.activeArcs.get(arcId);
  if (!arc) return false;
  arc.currentNodeId = nodeId;
  const authId = playerId || arc.playerIds[0];
  if (authId) {
    api.updateArcNode(authId, partyId, arcId, nodeId).catch((err) => {
      console.error('[arc-manager] Failed to sync arc node update:', err);
    });
  }
  return true;
}
export function markArcAtMerge(partyId: string, arcId: string, playerId?: string): boolean {
  const state = partyArcStates.get(partyId);
  const arc = state?.activeArcs.get(arcId);
  if (!state || !arc) return false;
  arc.status = 'waiting_at_merge';
  state.arcsWaitingAtMerge.add(arcId);
  const authId = playerId || arc.playerIds[0];
  if (authId) {
    api.markArcAtMerge(authId, partyId, arcId).catch((err) => {
      console.error('[arc-manager] Failed to sync mark at merge:', err);
    });
  }
  return true;
}
export function areAllArcsAtMerge(partyId: string): boolean {
  const state = partyArcStates.get(partyId);
  if (!state) return false;
  const activeArcIds = Array.from(state.activeArcs.keys());
  return activeArcIds.every(arcId => state.arcsWaitingAtMerge.has(arcId));
}
export function getArcsNotAtMerge(partyId: string): string[] {
  const state = partyArcStates.get(partyId);
  if (!state) return [];
  return Array.from(state.activeArcs.keys())
    .filter(arcId => !state.arcsWaitingAtMerge.has(arcId));
}
export function mergeArcs(partyId: string, playerId?: string): string | undefined {
  const state = partyArcStates.get(partyId);
  if (!state) return undefined;
  const mergeNodeId = state.mergeNodeId;
  const authId = playerId || Array.from(state.playerArcAssignment.keys())[0];
  partyArcStates.delete(partyId);
  if (authId) {
    api.completeArcMerge(authId, partyId).catch((err) => {
      console.error('[arc-manager] Failed to sync arc merge:', err);
    });
  }
  return mergeNodeId;
}
export function isPartyInArcSplit(partyId: string): boolean {
  return partyArcStates.has(partyId);
}
export function getMergeNodeId(partyId: string): string | undefined {
  const state = partyArcStates.get(partyId);
  return state?.mergeNodeId;
}
export function clearArcState(partyId: string): void {
  partyArcStates.delete(partyId);
}
