import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { buildCanvas } from '../../quickstart/canvas-builder.js';
import type { StoryNode, BuilderResult } from '../types.js';
import type { MultiplayerSession } from '../../types/party.js';

export interface NarrativeBuilderContext {
  playerId: string;
  party?: MultiplayerSession | null;
}

export async function buildNarrativeNode(
  node: StoryNode,
  nextNodeId?: string,
  context?: NarrativeBuilderContext
): Promise<BuilderResult> {
  const publicEmbed = node.public_embed;
  const embed = new EmbedBuilder().setColor(publicEmbed?.color ?? 0x0e1015);
  if (publicEmbed?.title) embed.setTitle(publicEmbed.title);
  else if (node.title) embed.setTitle(node.title);
  if (publicEmbed?.description) embed.setDescription(publicEmbed.description);
  if (publicEmbed?.footer) embed.setFooter({ text: publicEmbed.footer });
  if (publicEmbed?.fields?.length) {
    for (const field of publicEmbed.fields) {
      embed.addFields({
        name: field.name,
        value: field.value,
        inline: field.inline ?? false,
      });
    }
  }
  let attachment = null;
  if (publicEmbed?.image) {
    const subtitle = publicEmbed?.caption || publicEmbed?.title || node.title;
    attachment = await buildCanvas(publicEmbed.image, subtitle);
    embed.setImage(`attachment://${attachment.name}`);
  }
  let components: any[] | null = null;
  const resolvedNextId =
    nextNodeId ?? node.type_specific?.extra_data?.nextNodeId;
  
  // Only party leader can press Continue in multiplayer
  // In solo play (no party), anyone can continue
  let isLeader = true;
  if (context?.party && context.party.status === 'active' && context.playerId) {
    isLeader = context.party.ownerId === context.playerId;
  }

  if (resolvedNextId && isLeader) {
    components = [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`engine:continue:${resolvedNextId}`)
          .setLabel('Continue')
          .setEmoji('▶️')
          .setStyle(ButtonStyle.Primary)
      ),
    ];
  }
  return { embed, components, attachment: attachment ?? undefined };
}

