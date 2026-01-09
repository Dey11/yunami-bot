import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { buildCanvas } from '../../quickstart/canvas-builder.js';
import {
  getMemoryAttempts,
  getMemoryHintIndex,
  getPartyRole,
} from '../../quickstart/runtime-graph.js';
import type { StoryNode, BuilderResult, MemoryConfig } from '../types.js';
export interface MemoryBuilderContext {
  playerId: string;
  nodeId: string;
}
export async function buildMemoryNode(
  node: StoryNode,
  context: MemoryBuilderContext
): Promise<BuilderResult> {
  const publicEmbed = node.public_embed;
  const memory = node.type_specific?.memory;
  const embed = new EmbedBuilder().setColor(publicEmbed?.color ?? 0x9b59b6);
  if (publicEmbed?.title) embed.setTitle(publicEmbed.title);
  else if (node.title) embed.setTitle(node.title);
  else embed.setTitle('Memory Challenge');
  let description = publicEmbed?.description ?? '';
  if (memory?.question) {
    description += `\n\n**Question:** ${memory.question}`;
  }
  embed.setDescription(description);
  if (memory?.max_attempts) {
    const remaining = getMemoryAttempts(context.playerId, context.nodeId);
    embed.addFields({
      name: 'Attempts',
      value: `${remaining} remaining`,
      inline: true,
    });
  }
  if (memory?.hints?.length) {
    const hintIndex = getMemoryHintIndex(context.playerId, context.nodeId);
    if (hintIndex > 0) {
      const revealedHints = memory.hints.slice(0, hintIndex);
      embed.addFields({
        name: 'Hints',
        value: revealedHints.map((h, i) => `${i + 1}. ${h}`).join('\n'),
        inline: false,
      });
    }
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
  if (publicEmbed?.image) {
    const subtitle = publicEmbed?.caption || publicEmbed?.title || node.title;
    attachment = await buildCanvas(publicEmbed.image, subtitle);
    embed.setImage(`attachment://${attachment.name}`);
  }
  const components: ActionRowBuilder<ButtonBuilder>[] = [];

  // Get player's role for filtering
  const playerRole = getPartyRole(context.playerId);

  // If allowed_roles is specified, check if player can interact
  const canInteract = !memory?.allowed_roles || 
    memory.allowed_roles.length === 0 ||
    (playerRole && memory.allowed_roles.includes(playerRole));

  if (canInteract) {
    const buttonRow = new ActionRowBuilder<ButtonBuilder>();
    buttonRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`memory:${context.nodeId}:answer`)
        .setLabel('Answer')
        .setEmoji('✏️')
        .setStyle(ButtonStyle.Primary)
    );
    if (memory?.hints?.length) {
      const hintIndex = getMemoryHintIndex(context.playerId, context.nodeId);
      const hintsRemaining = memory.hints.length - hintIndex;
      buttonRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`memory:${context.nodeId}:hint`)
          .setLabel(`Hint (${hintsRemaining} left)`)
          .setEmoji('💡')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(hintsRemaining <= 0)
      );
    }
    components.push(buttonRow);
  }

  return {
    embed,
    components: components.length > 0 ? components : null,
    attachment: attachment ?? undefined,
  };
}
export function checkMemoryAnswer(
  answer: string,
  correctAnswers: string[],
  caseSensitive: boolean = false
): boolean {
  const normalizedAnswer = caseSensitive
    ? answer.trim()
    : answer.trim().toLowerCase();
  for (const correct of correctAnswers) {
    const normalizedCorrect = caseSensitive
      ? correct.trim()
      : correct.trim().toLowerCase();
    if (normalizedAnswer === normalizedCorrect) {
      return true;
    }
  }
  return false;
}
