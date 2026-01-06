import { MessageFlags } from 'discord.js';
import { storySceneBuilder } from '../quickstart/embed-builder.js';
import { initSession } from '../quickstart/runtime-graph.js';
import { storyGraph } from '../quickstart/story-graph.js';
import { renderNode } from '../engine/dispatcher.js';
import * as api from '../api/client.js';
export const handler = {
  id: /^start:.+/,
  async execute(interaction: any) {
    const odId = interaction.user.id;
    const storyId = interaction.customId.split(':')[1];
    const storyData = storyGraph.getStory(storyId);
    if (!storyData) {
      await interaction.reply({
        content: 'Story not found.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await interaction.deferUpdate();
    const { data: apiData, error } = await api.startStory(odId, storyId);
    if (error) {
       console.error('Failed to start story session on API:', error);
       await interaction.editReply({
        content: `Unable to sync story progress: ${error}`,
        components: [],
      });
      return;
    }
    const startNodeId = apiData?.progress?.currentNodeId || storyData.firstNodeId;
    initSession(odId, storyData.id, startNodeId, storyData);
    const firstNode = storyData.nodes[startNodeId];
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
        await storySceneBuilder(startNodeId, storyData);
      const payload: any = {
        embeds: [cutsceneEmbed],
        components: choicesButton ? [choicesButton] : [],
      };
      if (cutsceneImage) payload.files = [cutsceneImage];
      await interaction.editReply(payload);
    }
  },
};
