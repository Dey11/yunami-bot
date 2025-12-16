import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { storyGraph } from "./story.graph.js";

function resolveButtonStyle(style: unknown): ButtonStyle {
  if (typeof style === "number") {
    if (style === ButtonStyle.Primary) return ButtonStyle.Primary;
    if (style === ButtonStyle.Secondary) return ButtonStyle.Secondary;
    if (style === ButtonStyle.Success) return ButtonStyle.Success;
    if (style === ButtonStyle.Danger) return ButtonStyle.Danger;
  }

  if (typeof style === "string") {
    const lowered = style.toLowerCase();
    if (lowered === "primary") return ButtonStyle.Primary;
    if (lowered === "secondary") return ButtonStyle.Secondary;
    if (lowered === "success") return ButtonStyle.Success;
    if (lowered === "danger") return ButtonStyle.Danger;
  }

  return ButtonStyle.Primary;
}

export function storySceneBuilder(episodeId: string, nodeId: string) {
  const node = storyGraph.getNode(episodeId, nodeId);
  if (!node) {
    return [null, null] as const;
  }

  const checkpointText = node.checkpoint
    ? ` • Checkpoint: ${node.checkpoint.cardName ?? node.checkpoint.cardId}`
    : "";

  const cutsceneEmbed = new EmbedBuilder()
    .setColor(0x0e1015)
    .setTitle(node.title)
    .setDescription(node.content)
    .setFooter({
      text: `Your choices decide your trait${checkpointText}`,
    });

  if (node.imageUrl) {
    cutsceneEmbed.setImage(node.imageUrl);
  }

  const isEnding = storyGraph.isEnding(episodeId, nodeId);
  const choicesButton = new ActionRowBuilder<ButtonBuilder>();

  if (!isEnding) {
    for (const choice of node.choices) {
      const button = new ButtonBuilder()
        .setCustomId(`choice:${episodeId}:${choice.id}`)
        .setLabel(choice.label)
        .setStyle(resolveButtonStyle(choice.style));
      if (choice.emoji) button.setEmoji(choice.emoji);
      choicesButton.addComponents(button);
    }
  }

  return [cutsceneEmbed, choicesButton] as const;
}
