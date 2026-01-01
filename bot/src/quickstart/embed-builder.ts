import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { buildCanvas } from "./canvas-builder.js";

export async function storySceneBuilder(nodeId: string, storyData: any) {
  const node = storyData.nodes[nodeId];


  const cutsceneImage = node.imageUrl
    ? await buildCanvas(node.imageUrl)
    : null;

  const cutsceneEmbed = new EmbedBuilder()
    .setColor(0x0e1015)
    .setTitle(node.title)
    .setDescription(node.content)
    .setFooter({
      text: "Your choices decide your trait",
    });


  if (cutsceneImage) {
    cutsceneEmbed.setImage(`attachment://${cutsceneImage.name}`);
  }

  const choicesButton = new ActionRowBuilder<ButtonBuilder>();
  if (node.choices && node.choices.length > 0) {
    for (const choice of node.choices) {
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
