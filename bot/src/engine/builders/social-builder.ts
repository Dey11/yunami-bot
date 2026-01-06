import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { buildCanvas } from '../../quickstart/canvas-builder.js';
import { getResource } from '../../quickstart/runtime-graph.js';
import type { StoryNode, BuilderResult, SocialApproach } from '../types.js';
export interface SocialBuilderContext {
  playerId: string;
  nodeId: string;
}
export async function buildSocialNode(
  node: StoryNode,
  context: SocialBuilderContext
): Promise<BuilderResult> {
  const publicEmbed = node.public_embed;
  const social = node.type_specific?.social;
  const embed = new EmbedBuilder().setColor(publicEmbed?.color ?? 0xe91e63);
  if (publicEmbed?.title) embed.setTitle(publicEmbed.title);
  else if (node.title) embed.setTitle(node.title);
  else if (social?.npc_name) embed.setTitle(`💬 ${social.npc_name}`);
  if (publicEmbed?.description) embed.setDescription(publicEmbed.description);
  if (social) {
    const reputationStat = social.reputation_stat || 'reputation';
    const currentRep = getResource(context.playerId, reputationStat);
    embed.addFields({
      name: `Standing with ${social.npc_name}`,
      value: social.current_standing || getStandingLabel(currentRep),
      inline: true,
    });
    embed.addFields({
      name: 'Reputation',
      value: formatReputationBar(currentRep),
      inline: true,
    });
  }
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
  const subtitle =
    publicEmbed?.caption ||
    publicEmbed?.title ||
    node.title ||
    (social?.npc_name ? `💬 ${social.npc_name}` : undefined);
  if (publicEmbed?.image) {
    attachment = await buildCanvas(publicEmbed.image, subtitle);
    embed.setImage(`attachment://${attachment.name}`);
  } else if (social?.npc_image) {
    attachment = await buildCanvas(social.npc_image, subtitle);
    embed.setImage(`attachment://${attachment.name}`);
  }
  const components: ActionRowBuilder<ButtonBuilder>[] = [];
  if (social?.approaches?.length) {
    const approachRows = buildApproachButtons(
      social.approaches,
      context,
      social.reputation_stat || 'reputation'
    );
    components.push(...approachRows);
  }
  return {
    embed,
    components: components.length > 0 ? components : null,
    attachment: attachment ?? undefined,
  };
}
function buildApproachButtons(
  approaches: SocialApproach[],
  context: SocialBuilderContext,
  reputationStat: string
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  let currentRow = new ActionRowBuilder<ButtonBuilder>();
  let buttonCount = 0;
  const currentRep = getResource(context.playerId, reputationStat);
  for (const approach of approaches) {
    if (buttonCount >= 5) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder<ButtonBuilder>();
      buttonCount = 0;
    }
    const hasRequiredRep =
      approach.reputation_required === undefined ||
      currentRep >= approach.reputation_required;
    const button = new ButtonBuilder()
      .setCustomId(`social:${context.nodeId}:${approach.id}`)
      .setLabel(approach.label)
      .setStyle(mapButtonStyle(approach.style))
      .setDisabled(!hasRequiredRep);
    if (approach.emoji) {
      button.setEmoji(approach.emoji);
    }
    currentRow.addComponents(button);
    buttonCount++;
  }
  if (buttonCount > 0) {
    rows.push(currentRow);
  }
  return rows;
}
function getStandingLabel(reputation: number): string {
  if (reputation >= 80) return '🌟 Trusted Ally';
  if (reputation >= 60) return '😊 Friendly';
  if (reputation >= 40) return '😐 Neutral';
  if (reputation >= 20) return '😒 Distrustful';
  return '😡 Hostile';
}
function formatReputationBar(reputation: number): string {
  const normalized = Math.max(0, Math.min(100, reputation));
  const filled = Math.round(normalized / 10);
  const empty = 10 - filled;
  let emoji: string;
  if (normalized >= 60) emoji = '🟢';
  else if (normalized >= 40) emoji = '🟡';
  else emoji = '🔴';
  return `${emoji.repeat(filled)}⚫${emoji === '🟢' ? '' : ''}${'⚫'.repeat(Math.max(0, empty - 1))} ${normalized}`;
}
function mapButtonStyle(style?: number): ButtonStyle {
  switch (style) {
    case 1:
      return ButtonStyle.Primary;
    case 2:
      return ButtonStyle.Secondary;
    case 3:
      return ButtonStyle.Success;
    case 4:
      return ButtonStyle.Danger;
    default:
      return ButtonStyle.Primary;
  }
}
