import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { buildCanvas } from './canvas-builder.js';

export async function storySceneBuilder(nodeId: string, storyData: any) {
  const node = storyData.nodes[nodeId];

  const imageUrl = node.imageUrl || node.public_embed?.image;
  const cutsceneImage = imageUrl ? await buildCanvas(imageUrl) : null;

  const title = node.public_embed?.title || node.title;
  const description = node.public_embed?.description || node.content || '';
  const color = node.public_embed?.color ?? 0x0e1015;

  const cutsceneEmbed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({
      text: node.public_embed?.footer || 'Your choices decide your trait',
    });

  if (cutsceneImage) {
    cutsceneEmbed.setImage(`attachment://${cutsceneImage.name}`);
  }

  const choicesButton = new ActionRowBuilder<ButtonBuilder>();
  const choices = node.choices || node.type_specific?.choices || [];

  if (choices.length > 0) {
    for (const choice of choices) {
      choicesButton.addComponents(
        new ButtonBuilder()
          .setCustomId(choice.id)
          .setLabel(choice.label)
          .setEmoji(choice.emoji)
          .setStyle(choice.style || ButtonStyle.Primary)
      );
    }
    return [cutsceneEmbed, choicesButton, cutsceneImage];
  }

  return [cutsceneEmbed, null, cutsceneImage];
}
