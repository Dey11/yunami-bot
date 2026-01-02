import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { buildCanvas } from '../../quickstart/canvas-builder.js';
import type { StoryNode, BuilderResult } from '../types.js';

export async function buildDMNode(
  node: StoryNode,
  nextNodeId?: string
): Promise<BuilderResult> {
  const publicEmbed = node.public_embed;
  const typeSpecific = node.type_specific;

  const embed = new EmbedBuilder().setColor(publicEmbed?.color ?? 0x5865f2);

  if (publicEmbed?.title) embed.setTitle(publicEmbed.title);
  else if (node.title) embed.setTitle(node.title);
  else embed.setTitle('📩 Private Information');

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
  const resolvedNextId = nextNodeId ?? typeSpecific?.extra_data?.nextNodeId;

  if (resolvedNextId) {
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
