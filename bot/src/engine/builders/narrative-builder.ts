import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} from "discord.js";
import { buildCanvas } from "../../quickstart/canvas-builder.js";
import type { StoryNode, BuilderResult } from "../types.js";

export async function buildNarrativeNode(
    node: StoryNode,
    nextNodeId?: string
): Promise<BuilderResult> {
    const publicEmbed = node.public_embed;

    const embed = new EmbedBuilder().setColor(publicEmbed?.color ?? 0x0e1015);

    if (publicEmbed?.title) embed.setTitle(publicEmbed.title);
    else if (node.title) embed.setTitle(node.title);

    if (publicEmbed?.description) embed.setDescription(publicEmbed.description);
    if (publicEmbed?.footer) embed.setFooter({ text: publicEmbed.footer });

    if (publicEmbed?.fields?.length) {
        for (const field of publicEmbed.fields) {
            embed.addFields({ name: field.name, value: field.value, inline: field.inline ?? false });
        }
    }

    let attachment = null;
    if (publicEmbed?.image) {
        attachment = await buildCanvas(publicEmbed.image);
        embed.setImage(`attachment://${attachment.name}`);
    }

    let components: any[] | null = null;
    if (nextNodeId) {
        components = [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(`engine:continue:${nextNodeId}`)
                    .setLabel("Continue")
                    .setEmoji("▶️")
                    .setStyle(ButtonStyle.Primary)
            ),
        ];
    }

    return { embed, components, attachment: attachment ?? undefined };
}
