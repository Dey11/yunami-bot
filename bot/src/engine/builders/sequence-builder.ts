import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { buildCanvas } from '../../quickstart/canvas-builder.js';
import { getSequenceAttempts } from '../../quickstart/runtime-graph.js';
import type { StoryNode, BuilderResult, SequenceStep } from '../types.js';

export interface SequenceBuilderContext {
  playerId: string;
  nodeId: string;
  currentSelection?: string[];
}

export async function buildSequenceNode(
  node: StoryNode,
  context: SequenceBuilderContext
): Promise<BuilderResult> {
  const publicEmbed = node.public_embed;
  const sequence = node.type_specific?.sequence;

  const embed = new EmbedBuilder().setColor(publicEmbed?.color ?? 0x9b59b6);

  if (publicEmbed?.title) embed.setTitle(publicEmbed.title);
  else if (node.title) embed.setTitle(node.title);
  else embed.setTitle('🔢 Sequence Puzzle');

  if (publicEmbed?.description) embed.setDescription(publicEmbed.description);

  const currentSelection = context.currentSelection || [];
  const selectionDisplay =
    currentSelection.length > 0
      ? currentSelection
          .map((id, i) => {
            const step = sequence?.steps.find((s) => s.id === id);
            return `${i + 1}. ${step?.emoji || '•'} ${step?.label || id}`;
          })
          .join('\n')
      : '*No steps selected yet*';

  embed.addFields({
    name: '📋 Your Selection',
    value: selectionDisplay,
    inline: false,
  });

  if (sequence?.max_attempts) {
    const remaining = getSequenceAttempts(context.playerId, context.nodeId);
    embed.addFields({
      name: 'Attempts',
      value: `${remaining} remaining`,
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
  if (publicEmbed?.image) {
    const subtitle = publicEmbed?.caption || publicEmbed?.title || node.title;
    attachment = await buildCanvas(publicEmbed.image, subtitle);
    embed.setImage(`attachment://${attachment.name}`);
  }

  const components: ActionRowBuilder<ButtonBuilder>[] = [];

  if (sequence?.steps?.length) {
    const stepRows = buildStepButtons(
      sequence.steps,
      context.nodeId,
      currentSelection
    );
    components.push(...stepRows);
  }

  const controlRow = new ActionRowBuilder<ButtonBuilder>();

  if (currentSelection.length > 0) {
    controlRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`sequence:${context.nodeId}:undo`)
        .setLabel('Undo')
        .setEmoji('↩️')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  controlRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`sequence:${context.nodeId}:reset`)
      .setLabel('Reset')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentSelection.length === 0)
  );

  if (sequence && currentSelection.length === sequence.correct_order.length) {
    controlRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`sequence:${context.nodeId}:submit`)
        .setLabel('Submit')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success)
    );
  }

  if (controlRow.components.length > 0) {
    components.push(controlRow);
  }

  return {
    embed,
    components: components.length > 0 ? components : null,
    attachment: attachment ?? undefined,
  };
}

function buildStepButtons(
  steps: SequenceStep[],
  nodeId: string,
  currentSelection: string[]
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  let currentRow = new ActionRowBuilder<ButtonBuilder>();
  let buttonCount = 0;

  for (const step of steps) {
    if (buttonCount >= 5) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder<ButtonBuilder>();
      buttonCount = 0;
    }

    const isSelected = currentSelection.includes(step.id);

    const button = new ButtonBuilder()
      .setCustomId(`sequence:${nodeId}:step:${step.id}`)
      .setLabel(step.label)
      .setStyle(isSelected ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(isSelected);

    if (step.emoji) {
      button.setEmoji(step.emoji);
    }

    currentRow.addComponents(button);
    buttonCount++;
  }

  if (buttonCount > 0) {
    rows.push(currentRow);
  }

  return rows;
}

export function checkSequenceAnswer(
  selection: string[],
  correctOrder: string[]
): boolean {
  if (selection.length !== correctOrder.length) {
    return false;
  }

  for (let i = 0; i < selection.length; i++) {
    if (selection[i] !== correctOrder[i]) {
      return false;
    }
  }

  return true;
}
