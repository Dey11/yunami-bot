import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import type { StoryNode, BuilderResult } from '../types.js';
export function buildMetaNode(node: StoryNode): BuilderResult {
  const embed = node.public_embed;
  const action = node.type_specific?.extra_data?.action || 'default';
  const buttonLabel =
    node.type_specific?.extra_data?.button_label || 'Continue';
  const embedBuilder = new EmbedBuilder().setColor(embed?.color ?? 0x5865f2);
  if (embed?.title) embedBuilder.setTitle(embed.title);
  if (embed?.description) embedBuilder.setDescription(embed.description);
  if (embed?.footer) embedBuilder.setFooter({ text: embed.footer });
  if (embed?.image) embedBuilder.setImage(`attachment://${embed.image}`);
  if (embed?.fields) {
    for (const field of embed.fields) {
      embedBuilder.addFields({
        name: field.name,
        value: field.value,
        inline: field.inline,
      });
    }
  }
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`meta:${node.id}:${action}`)
      .setLabel(buttonLabel)
      .setStyle(ButtonStyle.Primary)
  );
  return {
    embed: embedBuilder,
    components: [row],
  };
}
