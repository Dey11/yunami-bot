import { initSession, setActiveMessage } from '../quickstart/runtime-graph.js';
import { storyGraph } from '../quickstart/story-graph.js';
import { renderNode } from '../engine/dispatcher.js';
import { initPrologueEvaluation } from '../engine/prologue-evaluator.js';

export const handler = {
  id: 'createProfile',
  async execute(interaction: any) {
    const odId = interaction.user.id;
    try {
      if (interaction.customId === 'createProfile') {
        const data = storyGraph.getStory('prologue_1');
        if (!data) {
          console.error('Prologue not found');
          return;
        }

        initSession(odId, data.id, data.firstNodeId, data);
        initPrologueEvaluation(odId);

        await interaction.deferUpdate();

        const firstNode = data.nodes[data.firstNodeId];
        if (!firstNode) {
          console.error('First node not found:', data.firstNodeId);
          return;
        }

        const nextNodeId = firstNode.type_specific?.extra_data?.nextNodeId;
        const result = await renderNode(firstNode, nextNodeId);
        const payload: any = {
          embeds: [result.embed],
          components: result.components ?? [],
        };
        if (result.attachment) {
          payload.files = [result.attachment];
        }

        const reply = await interaction.editReply(payload);
        setActiveMessage(odId, reply.channelId, reply.id);
        return;
      }
    } catch (error) {
      console.error(error);
    }
  },
};
