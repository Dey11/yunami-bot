/**
 * Arc Split Builder
 * 
 * Handles rendering arc_split nodes and auto-assigning players to arcs.
 */

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import type { StoryNode, BuilderResult, ArcDefinition } from '../types.js';
import type { MultiplayerSession } from '../../types/party.js';
import { initArcSplit } from '../arc-manager.js';
import { getPartyRole } from '../../quickstart/runtime-graph.js';

export interface ArcSplitContext {
  playerId: string;
  party: MultiplayerSession | null;
  nodeId: string;
}

export interface ArcSplitResult extends BuilderResult {
  /** Arc assignments for triggering navigation */
  arcAssignments?: Map<string, string>; // playerId -> entry_node_id
}

/**
 * Build the arc_split node.
 * Auto-assigns players to arcs and returns the split embed.
 */
export async function buildArcSplitNode(
  node: StoryNode,
  context: ArcSplitContext
): Promise<ArcSplitResult> {
  const publicEmbed = node.public_embed;
  const arcSplitConfig = node.type_specific?.arc_split;

  if (!arcSplitConfig) {
    throw new Error('arc_split node missing arc_split config');
  }

  if (!context.party) {
    throw new Error('arc_split requires a party (multiplayer)');
  }

  // Build player list with roles
  const players = context.party.players.map(p => ({
    odId: p.odId,
    role: p.role || getPartyRole(p.odId),
  }));

  // Initialize arc split and assign players
  const arcState = initArcSplit(
    context.party.id,
    node.id,
    arcSplitConfig,
    players
  );

  // Build the split announcement embed
  const embed = new EmbedBuilder()
    .setColor(publicEmbed?.color ?? 0x9b59b6);

  if (publicEmbed?.title) embed.setTitle(publicEmbed.title);
  else if (node.title) embed.setTitle(node.title);
  else embed.setTitle('⚔️ The Group Splits');

  // Build description showing assignments
  let description = publicEmbed?.description || 'Your group is splitting up...';
  description += '\n\n**Team Assignments:**\n';

  for (const [arcId, arc] of arcState.activeArcs) {
    const playerNames = arc.playerIds
      .map((id: string) => {
        const player = context.party!.players.find(p => p.odId === id);
        return player?.username || 'Unknown';
      })
      .join(', ');

    const arcDef = arc.arcDefinition;
    description += `\n**${arcDef.label}**${arc.isSoloArc ? ' 🎭' : ''}\n`;
    description += `> ${playerNames}\n`;
    if (arcDef.description) {
      description += `> *${arcDef.description}*\n`;
    }
  }

  embed.setDescription(description);

  if (publicEmbed?.footer) {
    embed.setFooter({ text: publicEmbed.footer });
  } else {
    embed.setFooter({ text: 'Each team will proceed to their own path' });
  }

  // Build arc assignment map for navigation
  const arcAssignments = new Map<string, string>();
  for (const [arcId, arc] of arcState.activeArcs) {
    for (const playerId of arc.playerIds) {
      arcAssignments.set(playerId, arc.arcDefinition.entry_node_id);
    }
  }

  // Create continue buttons - each player gets routed to their arc
  const components = [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`arc_continue:${node.id}`)
        .setLabel('Continue')
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Primary)
    ),
  ];

  return {
    embed,
    components,
    arcAssignments,
  };
}

/**
 * Get the arc info display for an arc definition.
 */
export function formatArcInfo(arc: ArcDefinition, playerCount: number): string {
  const parts = [arc.label];
  
  if (arc.description) {
    parts.push(`*${arc.description}*`);
  }
  
  parts.push(`Players: ${playerCount}`);
  
  if (arc.required_roles?.length) {
    parts.push(`Requires: ${arc.required_roles.join(', ')}`);
  }
  
  return parts.join('\n');
}
