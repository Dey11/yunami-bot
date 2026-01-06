/**
 * Arc Manager
 * 
 * Central module for tracking active arcs per party.
 * Handles arc assignment, state tracking, and merge coordination.
 */

import type { ArcDefinition, ArcSplitConfig } from './types.js';
import { getPartyRole } from '../quickstart/runtime-graph.js';

// ============ Types ============

export interface ActiveArc {
  arcId: string;
  arcDefinition: ArcDefinition;
  playerIds: string[];
  currentNodeId: string;
  startedAt: Date;
  status: 'active' | 'waiting_at_merge' | 'completed';
  /** True if only 1 player - use solo mechanics (no voting) */
  isSoloArc: boolean;
}

export interface PartyArcState {
  partyId: string;
  /** Map of arcId -> ActiveArc */
  activeArcs: Map<string, ActiveArc>;
  /** Map of playerId -> arcId */
  playerArcAssignment: Map<string, string>;
  /** Node where all arcs converge */
  mergeNodeId: string;
  /** Set of arcIds that have reached the merge point */
  arcsWaitingAtMerge: Set<string>;
  /** Original split node ID for reference */
  splitNodeId: string;
}

// ============ State Storage ============

/** Map of partyId -> PartyArcState */
const partyArcStates = new Map<string, PartyArcState>();

// ============ Core Functions ============

/**
 * Initialize an arc split for a party.
 * Assigns players to arcs based on split_mode.
 */
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
  return state;
}

/**
 * Assign players to arcs based on split_mode.
 * Falls back to random if role_based doesn't find matches.
 */
function assignPlayersToArcs(
  splitConfig: ArcSplitConfig,
  players: Array<{ odId: string; role?: string }>
): Map<string, string[]> {
  const assignments = new Map<string, string[]>();
  const unassignedPlayers = [...players];

  // Initialize empty arrays for each arc
  for (const arc of splitConfig.arcs) {
    assignments.set(arc.id, []);
  }

  if (splitConfig.split_mode === 'role_based') {
    // Try to assign by role first
    for (const arc of splitConfig.arcs) {
      if (arc.required_roles && arc.required_roles.length > 0) {
        const playerCount = arc.player_count === 'remaining' 
          ? unassignedPlayers.length 
          : arc.player_count;

        for (let i = 0; i < playerCount && unassignedPlayers.length > 0; i++) {
          // Find a player with matching role
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

    // Try preferred_roles for remaining slots
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

  // Fill remaining slots with random/remaining players
  for (const arc of splitConfig.arcs) {
    const currentCount = assignments.get(arc.id)!.length;
    const targetCount = arc.player_count === 'remaining'
      ? unassignedPlayers.length
      : arc.player_count;
    const needed = targetCount - currentCount;

    for (let i = 0; i < needed && unassignedPlayers.length > 0; i++) {
      // Random selection from remaining
      const randomIdx = Math.floor(Math.random() * unassignedPlayers.length);
      const player = unassignedPlayers.splice(randomIdx, 1)[0];
      assignments.get(arc.id)!.push(player.odId);
    }
  }

  return assignments;
}

/**
 * Get the arc state for a party.
 */
export function getPartyArcState(partyId: string): PartyArcState | undefined {
  return partyArcStates.get(partyId);
}

/**
 * Get the arc ID a player is currently in.
 */
export function getPlayerArc(partyId: string | undefined, playerId: string): string | undefined {
  if (!partyId) return undefined;
  const state = partyArcStates.get(partyId);
  return state?.playerArcAssignment.get(playerId);
}

/**
 * Get all player IDs in a specific arc.
 */
export function getArcPlayers(partyId: string, arcId: string): string[] {
  const state = partyArcStates.get(partyId);
  const arc = state?.activeArcs.get(arcId);
  return arc?.playerIds || [];
}

/**
 * Get the active arc object.
 */
export function getActiveArc(partyId: string | undefined, arcId: string): ActiveArc | undefined {
  if (!partyId) return undefined;
  const state = partyArcStates.get(partyId);
  return state?.activeArcs.get(arcId);
}

/**
 * Check if a player is in a solo arc (no voting needed).
 */
export function isPlayerInSoloArc(partyId: string | undefined, playerId: string): boolean {
  if (!partyId) return true; // Solo player
  const arcId = getPlayerArc(partyId, playerId);
  if (!arcId) return true;
  const arc = getActiveArc(partyId, arcId);
  return arc?.isSoloArc ?? true;
}

/**
 * Update the current node for an arc.
 */
export function updateArcNode(partyId: string, arcId: string, nodeId: string): boolean {
  const state = partyArcStates.get(partyId);
  const arc = state?.activeArcs.get(arcId);
  if (!arc) return false;

  arc.currentNodeId = nodeId;
  return true;
}

/**
 * Mark an arc as having reached the merge point.
 */
export function markArcAtMerge(partyId: string, arcId: string): boolean {
  const state = partyArcStates.get(partyId);
  const arc = state?.activeArcs.get(arcId);
  if (!state || !arc) return false;

  arc.status = 'waiting_at_merge';
  state.arcsWaitingAtMerge.add(arcId);
  return true;
}

/**
 * Check if all arcs have reached the merge point.
 */
export function areAllArcsAtMerge(partyId: string): boolean {
  const state = partyArcStates.get(partyId);
  if (!state) return false;

  // Only count arcs that have players
  const activeArcIds = Array.from(state.activeArcs.keys());
  return activeArcIds.every(arcId => state.arcsWaitingAtMerge.has(arcId));
}

/**
 * Get list of arcs still in progress (not at merge).
 */
export function getArcsNotAtMerge(partyId: string): string[] {
  const state = partyArcStates.get(partyId);
  if (!state) return [];

  return Array.from(state.activeArcs.keys())
    .filter(arcId => !state.arcsWaitingAtMerge.has(arcId));
}

/**
 * Complete the arc split and return to unified party state.
 */
export function mergeArcs(partyId: string): string | undefined {
  const state = partyArcStates.get(partyId);
  if (!state) return undefined;

  const mergeNodeId = state.mergeNodeId;

  // Clear arc state
  partyArcStates.delete(partyId);

  return mergeNodeId;
}

/**
 * Check if a party is currently in an arc split.
 */
export function isPartyInArcSplit(partyId: string): boolean {
  return partyArcStates.has(partyId);
}

/**
 * Get the merge node ID for the current arc split.
 */
export function getMergeNodeId(partyId: string): string | undefined {
  const state = partyArcStates.get(partyId);
  return state?.mergeNodeId;
}

/**
 * Clear arc state for a party (cleanup).
 */
export function clearArcState(partyId: string): void {
  partyArcStates.delete(partyId);
}
