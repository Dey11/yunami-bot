import { storySceneBuilder } from '../quickstart/embed-builder.js';
import { initSession } from '../quickstart/runtime-graph.js';
import * as api from '../api/client.js';

export const handler = {
  id: 'createProfile',
  async execute(interaction: any) {
    const discordId = interaction.user.id;
    const username = interaction.user.username;

    try {
      if (interaction.customId === 'createProfile') {
        await interaction.deferUpdate();

        // Register user with backend (or get existing)
        const registerResult = await api.register(discordId, username);
        // Ignore error if user already exists

        // Start prologue via backend
        const prologueResult = await api.startPrologue(discordId);
        if (prologueResult.error) {
          await interaction.editReply({
            content: `Error: ${prologueResult.error}`,
            components: [],
          });
          return;
        }

        // Fetch prologue story from backend
        const storyResponse = await api.getStory(discordId, 'prologue_1');
        if (storyResponse.error || !storyResponse.data?.story) {
          await interaction.editReply({
            content: 'Prologue story not found.',
            components: [],
          });
          return;
        }

        const storyData = storyResponse.data.story;
        const progress = prologueResult.data?.progress;
        const startNodeId = progress?.currentNodeId || storyData.firstNodeId;

        // Initialize local session for rendering
        initSession(discordId, storyData.id, startNodeId, storyData);

        const [cutsceneEmbed, choicesButton, cutsceneImage] =
          await storySceneBuilder(startNodeId, storyData);

        const payload: any = {
          embeds: [cutsceneEmbed],
          components: choicesButton ? [choicesButton] : [],
        };
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
