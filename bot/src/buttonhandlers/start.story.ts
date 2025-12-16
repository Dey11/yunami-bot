import { MessageFlags } from "discord.js";
import { storySceneBuilder } from "../quickstart/embed.builder.js";
import { initSession } from "../quickstart/runtime.graph.js";
import { storyGraph } from "../quickstart/story.graph.js";

export const handler = {
    id: /^start:.+/,
    async execute(interaction: any) {
        const odId = interaction.user.id;
        const storyId = interaction.customId.split(":")[1];
        const storyData = storyGraph.getStory(storyId);

        if (!storyData) {
            await interaction.reply({ content: "Story not found.", flags: MessageFlags.Ephemeral });
            return;
        }

        initSession(odId, storyData.id, storyData.firstNodeId, storyData);
        await interaction.deferUpdate();
        const [cutsceneEmbed, choicesButton, cutsceneImage] = await storySceneBuilder(storyData.firstNodeId, storyData);

        const payload: any = { embeds: [cutsceneEmbed], components: [choicesButton] };
        if (cutsceneImage) {
            payload.files = [cutsceneImage];
        }

        await interaction.editReply(payload);
    },
};
