/**
 * Combat Handler
 * Handles combat button interactions, delegating all logic to the server.
 * UI building is still done locally via combat-builder.
 */

import { MessageFlags } from 'discord.js';
import {
  getSession,
  recordChoice,
  setActiveMessage,
} from '../quickstart/runtime-graph.js';
import { getPartyByPlayer } from '../quickstart/party-session.js';
import { renderNodeWithContext } from '../engine/dispatcher.js';
import { buildCombatNode } from '../engine/builders/combat-builder.js';
import * as api from '../api/client.js';

export const handler = {
  id: /^combat:(.+):(.+)$/,
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

    const match = interaction.customId.match(/^combat:(.+):(.+)$/);
    if (!match) {
      await interaction.reply({
        content: 'Invalid combat action.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const [, nodeId, actionId] = match;
    const currentNode = session.storyData.nodes?.[nodeId];
    if (!currentNode || currentNode.type !== 'combat') {
      await interaction.reply({
        content: 'Combat node not found.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferUpdate();

    // ============== SERVER-SIDE COMBAT PROCESSING ==============
    const response = await api.processCombatAction(odId, nodeId, actionId);

    if (response.error) {
      await interaction.editReply({
        content: `Combat error: ${response.error}`,
      });
      return;
    }

    const { combatLog, state, outcome, nextNodeId, nextNode } = response.data!;

    // Handle combat ending (victory, defeat, flee)
    if (outcome !== 'continue' && nextNodeId && nextNode) {
      recordChoice(odId, `combat:${nodeId}:${outcome}`, nextNodeId);

      const party = getPartyByPlayer(odId);
      const result = await renderNodeWithContext(nextNode, {
        playerId: odId,
        nodeId: nextNode.id,
        party,
      });

      const outcomeMessage =
        outcome === 'victory'
          ? combatLog.join('\n') + '\n\nVictory! All enemies defeated!'
          : outcome === 'defeat'
            ? combatLog.join('\n') + '\n\nYou have been defeated!'
            : combatLog.join('\n');

      const payload: any = {
        content: outcomeMessage,
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

    // Combat continues - rebuild the UI with server state
    // Temporarily store state for the builder to use
    const { setCombatState } = await import('../quickstart/runtime-graph.js');
    setCombatState(odId, nodeId, state);

    const result = await buildCombatNode(currentNode, {
      playerId: odId,
      nodeId: nodeId,
    });

    const payload: any = {
      content: combatLog.join('\n'),
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
  },
};
