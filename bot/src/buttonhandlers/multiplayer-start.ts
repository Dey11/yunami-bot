import {
  startPartyStory,
  getPartyByOwner,
  getPartyByPlayer,
} from '../quickstart/party-session.js';
import { storyGraph } from '../quickstart/story-graph.js';
import { loadAndRenderNode } from '../engine/dispatcher.js';
import { setActiveMessage, setResource } from '../quickstart/runtime-graph.js';
import { MessageFlags } from 'discord.js';
export const handler = {
  id: /^mp_select_story_(.+)$/,
  execute: async (interaction: any) => {
    const match = interaction.customId.match(/^mp_select_story_(.+)$/);
    if (!match) return;
    const storyId = match[1];
    const party = await getPartyByOwner(interaction.user.id);
    if (!party) {
      await interaction.reply({
        content:
          'Unable to start story. Ensure you are the party owner and the party is waiting.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const result = startPartyStory(party.id, storyId);
    if (!result.success) {
      await interaction.reply({
        content: result.message,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const storyData = storyGraph.getStory(storyId);
    if (!storyData) {
      await interaction.reply({
        content: 'Story data not found.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const firstNodeId = result.party?.currentNodeId;
    if (!firstNodeId) {
      await interaction.reply({
        content: 'Error: Story has no entry node.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await interaction.deferUpdate();
    const firstNode = storyData.nodes[firstNodeId];
    if (!firstNode) {
      await interaction.editReply({ content: 'Error: First node not found.' });
      return;
    }
    for (const player of party.players) {
      setResource(player.odId, 'credits', 10);
    }
    const renderResult = await loadAndRenderNode(
      firstNode,
      interaction.user.id
    );
    if (!renderResult.allowed) {
      await interaction.editReply({
        content: `Cannot start: ${renderResult.reason}`,
      });
      return;
    }
    const payload: any = {
      content: `Multiplayer Story Started: ${storyData.title}`,
      embeds: [renderResult.result!.embed],
      components: renderResult.result!.components ?? [],
    };
    if (renderResult.result!.attachment) {
      payload.files = [renderResult.result!.attachment];
    }
    const response = await interaction.editReply(payload);
    for (const player of party.players) {
      setActiveMessage(player.odId, interaction.channelId, response.id);
    }
  },
};
