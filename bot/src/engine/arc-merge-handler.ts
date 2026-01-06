/**
 * Arc Merge Handler
 * 
 * Handles arc_merge nodes - coordinates arc convergence.
 */

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import type { StoryNode, BuilderResult } from './types.js';
import type { MultiplayerSession } from '../types/party.js';
import {
  getPlayerArc,
  markArcAtMerge,
  areAllArcsAtMerge,
  getArcsNotAtMerge,
  getActiveArc,
  getPartyArcState,
  mergeArcs,
} from './arc-manager.js';

export interface ArcMergeContext {
  playerId: string;
  party: MultiplayerSession | null;
  nodeId: string;
}

export interface ArcMergeResult extends BuilderResult {
  /** True if all arcs have merged and party can continue */
  allMerged: boolean;
  /** Next node ID if merged */
  nextNodeId?: string;
}

/**
 * Handle a player reaching an arc_merge node.
 */
export async function handleArcMerge(
  node: StoryNode,
  context: ArcMergeContext
): Promise<ArcMergeResult> {
  const publicEmbed = node.public_embed;
  const nextNodeId = node.type_specific?.extra_data?.nextNodeId;

  if (!context.party) {
    // Solo player - just continue
    return buildMergeComplete(node, nextNodeId);
  }

  const partyId = context.party.id;
  const arcId = getPlayerArc(partyId, context.playerId);

  if (!arcId) {
    // Player not in an arc split - just continue
    return buildMergeComplete(node, nextNodeId);
  }

  // Mark this arc as having reached the merge point
  markArcAtMerge(partyId, arcId);

  // Check if all arcs are at merge
  if (areAllArcsAtMerge(partyId)) {
    // All arcs ready - complete the merge
    mergeArcs(partyId);
    return buildMergeComplete(node, nextNodeId);
  }

  // Not all arcs ready - show waiting embed
  return buildWaitingEmbed(node, partyId, context);
}

/**
 * Build the "waiting for other teams" embed.
 */
function buildWaitingEmbed(
  node: StoryNode,
  partyId: string,
  context: ArcMergeContext
): ArcMergeResult {
  const publicEmbed = node.public_embed;
  const arcsNotAtMerge = getArcsNotAtMerge(partyId);
  const arcState = getPartyArcState(partyId);

  const embed = new EmbedBuilder()
    .setColor(publicEmbed?.color ?? 0xf39c12);

  embed.setTitle('⏳ Waiting for Other Teams');

  let description = 'Your team has completed their arc!\n\n';
  description += '**Still in progress:**\n';

  for (const arcId of arcsNotAtMerge) {
    const arc = getActiveArc(partyId, arcId);
    if (arc) {
      description += `• ${arc.arcDefinition.label}\n`;
    }
  }

  description += '\n*Waiting for all teams to reach the reunion point...*';
  embed.setDescription(description);

  // Refresh button to check status
  const components = [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`arc_merge_refresh:${node.id}`)
        .setLabel('Check Status')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Secondary)
    ),
  ];

  return {
    embed,
    components,
    allMerged: false,
  };
}

/**
 * Build the merge complete embed.
 */
function buildMergeComplete(
  node: StoryNode,
  nextNodeId?: string
): ArcMergeResult {
  const publicEmbed = node.public_embed;

  const embed = new EmbedBuilder()
    .setColor(publicEmbed?.color ?? 0x2ecc71);

  if (publicEmbed?.title) embed.setTitle(publicEmbed.title);
  else if (node.title) embed.setTitle(node.title);
  else embed.setTitle('🤝 The Group Reunites');

  if (publicEmbed?.description) {
    embed.setDescription(publicEmbed.description);
  } else {
    embed.setDescription('All teams have returned. Your journey continues together.');
  }

  if (publicEmbed?.footer) {
    embed.setFooter({ text: publicEmbed.footer });
  }

  let components: any[] | null = null;
  if (nextNodeId) {
    components = [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`engine:continue:${nextNodeId}`)
          .setLabel('Continue Together')
          .setEmoji('▶️')
          .setStyle(ButtonStyle.Primary)
      ),
    ];
  }

  return {
    embed,
    components,
    allMerged: true,
    nextNodeId,
  };
}
