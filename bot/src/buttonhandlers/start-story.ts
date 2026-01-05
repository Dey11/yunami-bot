import { MessageFlags } from 'discord.js';
import { storySceneBuilder } from '../quickstart/embed-builder.js';
import { initSession } from '../quickstart/runtime-graph.js';
import { renderNode } from '../engine/dispatcher.js';
import * as api from '../api/client.js';

export const handler = {
  id: /^start:.+/,
  async execute(interaction: any) {
    const discordId = interaction.user.id;
    const storyId = interaction.customId.split(':')[1];

    await interaction.deferUpdate();

    // Start story via backend API
    const { data, error } = await api.startStory(discordId, storyId);

    if (error) {
      await interaction.editReply({
        content: `Failed to start story: ${error}`,
        components: [],
      });
      return;
    }

    // Fetch story data from backend
    const storyResponse = await api.getStory(discordId, storyId);
    if (storyResponse.error || !storyResponse.data?.story) {
      await interaction.editReply({
        content: 'Story not found.',
        components: [],
      });
      return;
    }

    const storyData = storyResponse.data.story;
    const progress = data?.progress;
    const currentNodeId = progress?.currentNodeId || storyData.firstNodeId;

    // Initialize local session for rendering (still needed for now)
    initSession(discordId, storyData.id, currentNodeId, storyData);

    const firstNode = storyData.nodes[currentNodeId];

    if (firstNode.type) {
      const nextNodeId = firstNode.type_specific?.extra_data?.nextNodeId;
      const result = await renderNode(firstNode, nextNodeId);
      const payload: any = {
        embeds: [result.embed],
        components: result.components ?? [],
      };
      if (result.attachment) payload.files = [result.attachment];
      await interaction.editReply(payload);
    } else {
      const [cutsceneEmbed, choicesButton, cutsceneImage] =
        await storySceneBuilder(currentNodeId, storyData);
      const payload: any = {
        embeds: [cutsceneEmbed],
        components: choicesButton ? [choicesButton] : [],
      };
      if (cutsceneImage) payload.files = [cutsceneImage];
      await interaction.editReply(payload);
    }
  },
};
