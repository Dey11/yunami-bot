import { storySceneBuilder } from "../quickstart/embed.builder.js";
import { startPartyStory, getPartyByOwner } from "../quickstart/party.session.js";
import { storyGraph } from "../quickstart/story.graph.js";
import { MessageFlags } from "discord.js";

export const handler = {
    id: /^mp_select_story_(.+)$/,
    execute: async (interaction: any) => {
        const match = interaction.customId.match(/^mp_select_story_(.+)$/);
        if (!match) return;
        const storyId = match[1];

        const party = await getPartyByOwner(interaction.user.id);

        if (!party) {
            await interaction.reply({
                content: "Unable to start story. Ensure you are the party owner and the party is waiting.",
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const result = startPartyStory(party.id, storyId);
        if (!result.success) {
            await interaction.reply({
                content: result.message,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const storyData = storyGraph.getStory(storyId);

        if (!storyData) {
            await interaction.reply({
                content: "Story data not found.",
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const firstNodeId = result.party?.currentNodeId;

        if (!firstNodeId) {
            await interaction.reply({ content: "Error: Story has no entry node.", flags: MessageFlags.Ephemeral });
            return;
        }
        await interaction.deferUpdate();

        const [embed, components, attachment] = await storySceneBuilder(firstNodeId, storyData);

        const payload: any = {
            content: `Multiplayer Story Started: ${storyData.title}`,
            embeds: [embed],
            files: attachment ? [attachment] : [],
            components: []
        };

        if (components) {
            payload.components = [components];
        }

        await interaction.editReply(payload);
    }
};
