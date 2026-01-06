import type { StoryNode, BuilderResult } from './types.js';
import type { MultiplayerSession } from '../types/party.js';
import { buildNarrativeNode } from './builders/narrative-builder.js';
import {
  buildChoiceNode,
  type ChoiceBuilderContext,
} from './builders/choice-builder.js';
import { buildTimedNode } from './builders/timed-builder.js';
import { buildDMNode } from './builders/dm-builder.js';
import { buildSequenceNode } from './builders/sequence-builder.js';
import { buildSocialNode } from './builders/social-builder.js';
import { buildMemoryNode } from './builders/memory-builder.js';
import { buildCombatNode } from './builders/combat-builder.js';
import { buildArcSplitNode } from './builders/arc-split-builder.js';
import { handleArcMerge } from './arc-merge-handler.js';
import { checkPreconditions } from './preconditions.js';
import { executeSideEffects } from './side-effects.js';
import { getPartyByPlayer } from '../quickstart/party-session.js';
import { buildMetaNode } from './builders/meta-builder.js';

export interface NodeLoadResult {
  allowed: boolean;
  reason?: string;
  result?: BuilderResult;
}

export async function loadAndRenderNode(
  node: StoryNode,
  playerId: string,
  nextNodeId?: string,
  party?: MultiplayerSession | null
): Promise<NodeLoadResult> {
  const preconditionResult = checkPreconditions(node, playerId, party);
  if (!preconditionResult.allowed) {
    return {
      allowed: false,
      reason: preconditionResult.reason,
    };
  }

  if (!party) {
    party = getPartyByPlayer(playerId);
  }

  await executeSideEffects(node, playerId, party);

  const context: ChoiceBuilderContext = {
    playerId,
    nodeId: node.id,
    party,
  };

  const result = await renderNodeWithContext(node, context, nextNodeId);
  return {
    allowed: true,
    result,
  };
}

export async function renderNodeWithContext(
  node: StoryNode,
  context: ChoiceBuilderContext,
  nextNodeId?: string
): Promise<BuilderResult> {
  switch (node.type) {
    case 'narrative':
      return buildNarrativeNode(node, nextNodeId);

    case 'choice':
      return buildChoiceNode(node, context);

    case 'timed':
      return buildTimedNode(node, context);

    case 'dm':
      return buildDMNode(node, nextNodeId);

    case 'sequence':
      return buildSequenceNode(node, {
        playerId: context.playerId,
        nodeId: context.nodeId,
      });

    case 'social':
      return buildSocialNode(node, {
        playerId: context.playerId,
        nodeId: context.nodeId,
      });

    case 'memory':
      return buildMemoryNode(node, {
        playerId: context.playerId,
        nodeId: context.nodeId,
      });

    case 'combat':
      return buildCombatNode(node, {
        playerId: context.playerId,
        nodeId: context.nodeId,
      });

    case 'arc_split':
      return buildArcSplitNode(node, {
        playerId: context.playerId,
        party: context.party ?? null,
        nodeId: context.nodeId,
      });

    case 'arc_merge':
      return handleArcMerge(node, {
        playerId: context.playerId,
        party: context.party ?? null,
        nodeId: context.nodeId,
      });

    case 'meta':
      return buildMetaNode(node);

    default:
      throw new Error(`Unknown node type: ${node.type}`);
  }
}

export async function renderNode(
  node: StoryNode,
  nextNodeId?: string
): Promise<BuilderResult> {
  const defaultContext: ChoiceBuilderContext = {
    playerId: '',
    nodeId: node.id,
    party: null,
  };
  return renderNodeWithContext(node, defaultContext, nextNodeId);
}
