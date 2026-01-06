import { MessageFlags } from 'discord.js';
import {
  getSession,
  recordChoice,
  getResource,
  modifyResource,
  setActiveMessage,
} from '../quickstart/runtime-graph.js';
import { getPartyByPlayer } from '../quickstart/party-session.js';
import { renderNodeWithContext } from '../engine/dispatcher.js';
import type { SocialApproach } from '../engine/types.js';
export const handler = {
  id: /^social:(.+):(.+)$/,
  async execute(interaction: any) {
    const odId = interaction.user.id;
    const session = getSession(odId);
    if (!session) {
      await interaction.reply({
        content: 'No active session. Please start a new story.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const match = interaction.customId.match(/^social:(.+):(.+)$/);
    if (!match) {
      await interaction.reply({
        content: 'Invalid social action.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const [, nodeId, approachId] = match;
    const currentNode = session.storyData.nodes?.[nodeId];
    if (!currentNode || currentNode.type !== 'social') {
      await interaction.reply({
        content: 'Social node not found.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const social = currentNode.type_specific?.social;
    if (!social) {
      await interaction.reply({
        content: 'Invalid social configuration.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const approach = social.approaches.find(
      (a: SocialApproach) => a.id === approachId
    );
    if (!approach) {
      await interaction.reply({
        content: 'Approach not found.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const reputationStat = social.reputation_stat || 'reputation';
    const currentRep = getResource(odId, reputationStat);
    if (
      approach.reputation_required !== undefined &&
      currentRep < approach.reputation_required
    ) {
      await interaction.reply({
        content: `You need at least ${approach.reputation_required} reputation to use this approach.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await interaction.deferUpdate();
    const successChance = approach.success_chance ?? 100;
    const roll = Math.random() * 100;
    const isSuccess = roll < successChance;
    if (approach.reputation_change) {
      modifyResource(odId, reputationStat, approach.reputation_change);
    }
    const nextNodeId = isSuccess ? approach.on_success : approach.on_failure;
    if (nextNodeId) {
      const nextNode = session.storyData.nodes?.[nextNodeId];
      if (nextNode) {
        recordChoice(
          odId,
          `social:${approachId}:${isSuccess ? 'success' : 'failure'}`,
          nextNodeId
        );
        const party = getPartyByPlayer(odId);
        const result = await renderNodeWithContext(nextNode, {
          playerId: odId,
          nodeId: nextNode.id,
          party,
        });
        const outcomeEmoji = isSuccess ? '✅' : '❌';
        const outcomeText = isSuccess ? 'succeeded' : 'failed';
        const payload: any = {
          content: `${outcomeEmoji} Your **${approach.label}** approach ${outcomeText}!`,
          embeds: [result.embed],
          components: result.components ?? [],
        };
        if (result.attachment) {
          payload.files = [result.attachment];
        }
        await interaction.editReply(payload);
        setActiveMessage(
          odId,
          interaction.message.channelId,
          interaction.message.id
        );
        return;
      }
    }
    const outcomeEmoji = isSuccess ? '✅' : '❌';
    const outcomeText = isSuccess ? 'succeeded' : 'failed';
    const repChange = approach.reputation_change;
    const repText = repChange
      ? ` (${repChange > 0 ? '+' : ''}${repChange} reputation)`
      : '';
    await interaction.followUp({
      content: `${outcomeEmoji} Your **${approach.label}** approach ${outcomeText}!${repText}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
