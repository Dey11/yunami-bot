import { MessageFlags } from 'discord.js';
import {
  getSession,
  recordChoice,
  setActiveMessage,
} from '../quickstart/runtime-graph.js';
import { getPartyByPlayer } from '../quickstart/party-session.js';
import { renderNodeWithContext } from '../engine/dispatcher.js';

export const handler = {
  id: /^engine:continue:(.+)$/,

  async execute(interaction: any) {
    const match = interaction.customId.match(/^engine:continue:(.+)$/);
    if (!match) return;

    const nextNodeId = match[1];
    const userId = interaction.user.id;
    const session = getSession(userId);

    if (!session) {
      await interaction.reply({
        content: 'No active session. Please start a new story.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const storyData = session.storyData;
    const nextNode = storyData.nodes?.[nextNodeId];

    if (!nextNode) {
      await interaction.reply({
        content: 'Next scene not found.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    recordChoice(userId, `continue_${nextNodeId}`, nextNodeId);
    await interaction.deferUpdate();

    const party = getPartyByPlayer(userId);
    const context = {
      playerId: userId,
      nodeId: nextNode.id,
      party,
    };

    const result = await renderNodeWithContext(nextNode, context);

    const payload: any = {
      embeds: [result.embed],
      components: result.components ?? [],
    };
    if (result.attachment) payload.files = [result.attachment];

    await interaction.editReply(payload);
    setActiveMessage(
      userId,
      interaction.message.channelId,
      interaction.message.id
    );
  },
};
