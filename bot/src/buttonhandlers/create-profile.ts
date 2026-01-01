import { storySceneBuilder } from "../quickstart/embed-builder.js";
import { initSession } from "../quickstart/runtime-graph.js";
import { storyGraph } from "../quickstart/story-graph.js";

export const handler = {
  id: "createProfile",
  async execute(interaction: any) {
    const odId = interaction.user.id;
    try {
      if (interaction.customId === "createProfile") {
        const data = storyGraph.getStory("prologue_1");
        if (!data) {
          console.error("Prologue not found");
          return;
        }

        initSession(odId, data.id, data.firstNodeId, data);
        await interaction.deferUpdate();
        const [cutsceneEmbed, choicesButton, cutsceneImage] = await storySceneBuilder("intro_gate", data);

        const payload: any = { embeds: [cutsceneEmbed], components: [choicesButton] };
        if (cutsceneImage) {
          payload.files = [cutsceneImage];
        }

        await interaction.editReply(payload);
        return;
      }
    } catch (error) {
      console.error(error);
    }
  },
};