import { MessageFlags } from "discord.js";
import { getSession, recordChoice } from "../quickstart/runtime.graph.js";
import { renderNode } from "../engine/dispatcher.js";

export const handler = {
    id: /^engine:narrative:continue:(.+)$/,

    async execute(interaction: any) {
        const match = interaction.customId.match(/^engine:narrative:continue:(.+)$/);
        if (!match) return;

        const nextNodeId = match[1];
        const userId = interaction.user.id;
        const session = getSession(userId);

        if (!session) {
            await interaction.reply({
                content: "No active session. Please start a new story.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const storyData = session.storyData;
        const nextNode = storyData.nodes?.[nextNodeId];

        if (!nextNode) {
            await interaction.reply({
                content: "Next scene not found.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        recordChoice(userId, `continue_${nextNodeId}`, nextNodeId);
        await interaction.deferUpdate();

        const furtherNextId = nextNode.type_specific?.extra_data?.nextNodeId;
        const result = await renderNode(nextNode, furtherNextId);

        const payload: any = { embeds: [result.embed], components: result.components ?? [] };
        if (result.attachment) payload.files = [result.attachment];

        await interaction.editReply(payload);
    },
};
