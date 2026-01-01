import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { storyGraph } from "../../quickstart/story-graph.js";
import { initSession, setResource, getResource, setActiveMessage } from "../../quickstart/runtime-graph.js";
import { loadAndRenderNode } from "../../engine/dispatcher.js";

export const data = new SlashCommandBuilder()
    .setName("testchoice")
    .setDescription("Test the new engine systems (timed, voting, choices).")
    .addIntegerOption((option) =>
        option
            .setName("credits")
            .setDescription("Starting credits (default: 10)")
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(100)
    );

export async function execute(interaction: any) {
    const odId = interaction.user.id;
    const startingCredits = interaction.options.getInteger("credits") ?? 10;

    const storyData = storyGraph.getStory("test-choice");

    if (!storyData) {
        await interaction.reply({
            content: "Test story not found. Make sure test-choice.json exists in stories folder.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    initSession(odId, storyData.id, storyData.firstNodeId, storyData);
    setResource(odId, "credits", startingCredits);

    const firstNode = storyData.nodes[storyData.firstNodeId];
    const result = await loadAndRenderNode(firstNode, odId);

    if (!result.allowed) {
        await interaction.reply({
            content: `Cannot start: ${result.reason}`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const payload: any = {
        content: `**Testing Engine System** | Credits: ${getResource(odId, "credits")}`,
        embeds: [result.result!.embed],
        components: result.result!.components ?? [],
        withResponse: true,
    };

    if (result.result!.attachment) {
        payload.files = [result.result!.attachment];
    }

    const response = await interaction.reply(payload);
    const message = response.resource?.message;
    if (message) {
        setActiveMessage(odId, message.channelId, message.id);
    }
}


