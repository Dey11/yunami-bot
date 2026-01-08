import { initSession, setActiveMessage } from '../quickstart/runtime-graph.js';
import { MessageFlags } from 'discord.js';
import { storyGraph } from '../quickstart/story-graph.js';
import { renderNode } from '../engine/dispatcher.js';
import * as api from '../api/client.js';

export const handler = {
  id: 'createProfile',
  async execute(interaction: any) {
    const odId = interaction.user.id;
    try {
      const data = storyGraph.getStory('prologue_1');
      if (!data) {
        console.error('Prologue not found');
        await interaction.reply({ content: 'Prologue story not found.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.deferUpdate();
      const response = await api.startPrologue(odId);
      if (response.error) {
       if (response.error.includes('already completed')) {
           await interaction.editReply({ 
             content: 'You already have a profile! Use `/profile` to view it.',
             embeds: [],
             components: []
           });
           return;
         }
         console.error('API Error:', response.error);
         await interaction.editReply({ content: 'Failed to start prologue. Please try again.' });
         return;
      }
      const progress = response.data?.progress;
      const startNodeId = progress?.currentNodeId || data.firstNodeId;
      initSession(odId, data.id, startNodeId, data);

      const currentNode = data.nodes[startNodeId];
      if (!currentNode) {
        console.error('Node not found:', startNodeId);
        await interaction.editReply({ content: `Error: Node "${startNodeId}" not found in prologue.` });
        return;
      }
      const result = await renderNode(currentNode);
      const payload: any = {
        embeds: [result.embed],
        components: result.components ?? [],
      };
      if (result.attachment) {
        payload.files = [result.attachment];
      }
      const reply = await interaction.editReply(payload);
      setActiveMessage(odId, reply.channelId, reply.id);
    } catch (error) {
      console.error(error);
    }
  },
};
