import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import type { StoryNode, BuilderResult, ArcDefinition } from '../types.js';
import type { MultiplayerSession } from '../../types/party.js';
import { getPartyRole } from '../../quickstart/runtime-graph.js';

export interface ArcSplitContext {
  playerId: string;
  party: MultiplayerSession | null;
  nodeId: string;
}

export interface ArcSplitResult extends BuilderResult {
  roleInfo?: Map<string, string>; // role -> private info (for DM delivery)
}

/**
 * Arc-split in shared screen mode:
 * - Everyone sees the same screen with role assignments
 * - DM deliveries send private info to specific roles (via side_effects)
 * - Only leader can press Continue to proceed
 * - No separate paths - everyone stays on the same story track
 */
export async function buildArcSplitNode(
  node: StoryNode,
  context: ArcSplitContext
): Promise<ArcSplitResult> {
  const publicEmbed = node.public_embed;
  const arcSplitConfig = node.type_specific?.arc_split;
  
  if (!context.party) {
    throw new Error('arc_split requires a party (multiplayer)');
  }

  const embed = new EmbedBuilder()
    .setColor(publicEmbed?.color ?? 0x9b59b6);
  
  if (publicEmbed?.title) embed.setTitle(publicEmbed.title);
  else if (node.title) embed.setTitle(node.title);
  else embed.setTitle('📋 Mission Briefing');
  
  let description = publicEmbed?.description || 'Your team receives their assignments...';
  
  // Show role assignments if arc config exists
  if (arcSplitConfig?.arcs) {
    description += '\n\n**Assignments:**\n';
    
    for (const arc of arcSplitConfig.arcs) {
      // Find players with required roles for this arc
      const assignedPlayers = context.party.players.filter(p => {
        const playerRole = p.role || getPartyRole(p.odId);
        return arc.required_roles?.includes(playerRole || '') ?? false;
      });
      
      if (assignedPlayers.length > 0) {
        const playerNames = assignedPlayers.map(p => p.username).join(', ');
        description += `\n**${arc.label}**\n`;
        description += `> ${playerNames}\n`;
        if (arc.description) {
          description += `> *${arc.description}*\n`;
        }
      }
    }
  }
  
  embed.setDescription(description);
  
  if (publicEmbed?.footer) {
    embed.setFooter({ text: publicEmbed.footer });
  } else {
    embed.setFooter({ text: 'Private briefings have been sent to team members' });
  }

  // Only party leader can press Continue
  const isLeader = context.party.ownerId === context.playerId;
  
  // Get next node from the config (merge_node_id is where everyone goes)
  const nextNodeId = arcSplitConfig?.merge_node_id || node.type_specific?.extra_data?.nextNodeId;
  
  let components: ActionRowBuilder<ButtonBuilder>[] | null = null;
  if (nextNodeId && isLeader) {
    components = [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`engine:continue:${nextNodeId}`)
          .setLabel('Continue')
          .setEmoji('▶️')
          .setStyle(ButtonStyle.Primary)
      ),
    ];
  }

  return {
    embed,
    components,
  };
}

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

