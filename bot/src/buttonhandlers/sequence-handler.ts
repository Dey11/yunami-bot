import { MessageFlags } from 'discord.js';
import {
  getSession,
  recordChoice,
  getSequenceSelection,
  setSequenceSelection,
  clearSequenceSelection,
  getSequenceAttempts,
  decrementSequenceAttempts,
} from '../quickstart/runtime-graph.js';
import { getPartyByPlayer } from '../quickstart/party-session.js';
import {
  buildSequenceNode,
  checkSequenceAnswer,
} from '../engine/builders/sequence-builder.js';
import { renderNodeWithContext } from '../engine/dispatcher.js';
export const handler = {
  id: /^sequence:(.+):(.+)$/,
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
    const match = interaction.customId.match(/^sequence:([^:]+):(.+)$/);
    if (!match) {
      await interaction.reply({
        content: 'Invalid sequence action.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const [, nodeId, action] = match;
    const currentNode = session.storyData.nodes?.[nodeId];
    if (!currentNode || currentNode.type !== 'sequence') {
      await interaction.reply({
        content: 'Sequence node not found.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const sequence = currentNode.type_specific?.sequence;
    if (!sequence) {
      await interaction.reply({
        content: 'Invalid sequence configuration.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await interaction.deferUpdate();
    let currentSelection = getSequenceSelection(odId, nodeId) || [];
    if (action === 'reset') {
      clearSequenceSelection(odId, nodeId);
      currentSelection = [];
    } else if (action === 'undo') {
      currentSelection = currentSelection.slice(0, -1);
      setSequenceSelection(odId, nodeId, currentSelection);
    } else if (action === 'submit') {
      const isCorrect = checkSequenceAnswer(
        currentSelection,
        sequence.correct_order
      );
      if (isCorrect) {
        clearSequenceSelection(odId, nodeId);
        recordChoice(
          odId,
          `sequence:${nodeId}:success`,
          sequence.on_success ?? null
        );
        if (sequence.on_success) {
          const nextNode = session.storyData.nodes?.[sequence.on_success];
          if (nextNode) {
            const party = getPartyByPlayer(odId);
            const result = await renderNodeWithContext(nextNode, {
              playerId: odId,
              nodeId: nextNode.id,
              party,
            });
            const payload: any = {
              content: '✅ **Correct!** The sequence was right!',
              embeds: [result.embed],
              components: result.components ?? [],
            };
            if (result.attachment) {
              payload.files = [result.attachment];
            }
            await interaction.editReply(payload);
            return;
          }
        }
        await interaction.editReply({
          content: '✅ **Correct!** You solved the puzzle!',
        });
        return;
      } else {
        decrementSequenceAttempts(odId, nodeId);
        const remaining = getSequenceAttempts(odId, nodeId);
        if (remaining <= 0 && sequence.on_failure) {
          clearSequenceSelection(odId, nodeId);
          recordChoice(odId, `sequence:${nodeId}:failure`, sequence.on_failure);
          const nextNode = session.storyData.nodes?.[sequence.on_failure];
          if (nextNode) {
            const party = getPartyByPlayer(odId);
            const result = await renderNodeWithContext(nextNode, {
              playerId: odId,
              nodeId: nextNode.id,
              party,
            });
            const payload: any = {
              content: '❌ **Failed!** No attempts remaining.',
              embeds: [result.embed],
              components: result.components ?? [],
            };
            if (result.attachment) {
              payload.files = [result.attachment];
            }
            await interaction.editReply(payload);
            return;
          }
        }
        clearSequenceSelection(odId, nodeId);
        currentSelection = [];
        await interaction.followUp({
          content: `❌ **Wrong order!** ${remaining > 0 ? `${remaining} attempts remaining.` : 'Try again!'}`,
          flags: MessageFlags.Ephemeral,
        });
      }
    } else if (action.startsWith('step:')) {
      const stepId = action.replace('step:', '');
      if (!currentSelection.includes(stepId)) {
        currentSelection.push(stepId);
        setSequenceSelection(odId, nodeId, currentSelection);
      }
    }
    const party = getPartyByPlayer(odId);
    const result = await buildSequenceNode(currentNode, {
      playerId: odId,
      nodeId: currentNode.id,
      currentSelection,
    });
    const payload: any = {
      embeds: [result.embed],
      components: result.components ?? [],
    };
    if (result.attachment) {
      payload.files = [result.attachment];
    }
    await interaction.editReply(payload);
  },
};
