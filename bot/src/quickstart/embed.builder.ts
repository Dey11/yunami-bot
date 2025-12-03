import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import data from "./story.json";

export async function storySceneBuilder(nodeId: keyof typeof data.nodes) {
  try {
    console.log(data.nodes[nodeId]);
    console.log(nodeId);
    console.log(data.nodes[nodeId].id);
    const cutsceneEmbed = new EmbedBuilder()
      .setColor(0x0e1015)
      .setTitle(data.nodes[nodeId].title)
      .setDescription(data.nodes[nodeId].content)
      .setFooter({
        text: "Your choices decide your trait",
      })
      .setImage(data.nodes[nodeId].imageUrl);

    const choicesButton = new ActionRowBuilder<ButtonBuilder>();
    for (const choice of data.nodes[nodeId].choices) {
      choicesButton.addComponents(
        new ButtonBuilder()
          .setCustomId(choice.id)
          .setLabel(choice.label)
          .setEmoji(choice.emoji)
          .setStyle(choice.style || ButtonStyle.Primary)
      );
    }
    return [cutsceneEmbed, choicesButton];
  } catch (error) {
    console.error(error);
    return [null, null];
  }
}
