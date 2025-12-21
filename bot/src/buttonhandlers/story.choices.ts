import { MessageFlags } from "discord.js";
import { storySceneBuilder } from "../quickstart/embed.builder.js";
import { getSession, recordChoice } from "../quickstart/runtime.graph.js";

export const handler = {
    id: /^(?!start:).+/,
    async execute(interaction: any) {
        const odId = interaction.user.id;
        const session = getSession(odId);

        if (!session) {
            await interaction.reply({
                content: "No active session for this button. Please start a new story or use valid controls.",
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const storyData = session.storyData;
        let matchedChoice = null;

        for (const node of Object.values(storyData.nodes) as any[]) {
            const found = node.choices.find((c: any) => c.id === interaction.customId);
            if (found) {
                matchedChoice = found;
                break;
            }
        }

        if (matchedChoice) {
            recordChoice(odId, matchedChoice.id, matchedChoice.nextNodeId);
            if (matchedChoice.nextNodeId) {
                await interaction.deferUpdate();
                const [embed, buttons, image] = await storySceneBuilder(matchedChoice.nextNodeId, storyData);
                const payload: any = { embeds: [embed], components: [] };
                if (buttons) payload.components = [buttons];
                if (image) payload.files = [image];

                await interaction.editReply(payload);
            } else {
                await interaction.reply({ content: "The story ends here... for now.", flags: MessageFlags.Ephemeral });
            }
            return;
        } else {
            await interaction.reply({
                content: "This interaction belongs to an expired or different session. You have likely started a new story.",
                flags: MessageFlags.Ephemeral
            });
        }
    },
};
