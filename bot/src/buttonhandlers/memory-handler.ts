import {
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  LabelBuilder,
} from 'discord.js';
import {
  getSession,
  recordChoice,
  getMemoryAttempts,
  decrementMemoryAttempts,
  incrementMemoryHintIndex,
  clearMemoryState,
  setMemoryAttempts,
} from '../quickstart/runtime-graph.js';
import { getPartyByPlayer } from '../quickstart/party-session.js';
import {
  buildMemoryNode,
  checkMemoryAnswer,
} from '../engine/builders/memory-builder.js';
import { renderNodeWithContext } from '../engine/dispatcher.js';

export const handler = {
  id: /^memory:(.+):(.+)$/,
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

    const match = interaction.customId.match(/^memory:([^:]+):(.+)$/);
    if (!match) {
      await interaction.reply({
        content: 'Invalid memory action.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const [, nodeId, action] = match;

    const currentNode = session.storyData.nodes?.[nodeId];
    if (!currentNode || currentNode.type !== 'memory') {
      await interaction.reply({
        content: 'Memory node not found.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const memory = currentNode.type_specific?.memory;
    if (!memory) {
      await interaction.reply({
        content: 'Invalid memory configuration.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (memory.max_attempts) {
      const currentAttempts = getMemoryAttempts(odId, nodeId);
      if (currentAttempts === 3 && memory.max_attempts !== 3) {
        setMemoryAttempts(odId, nodeId, memory.max_attempts);
      }
    }

    if (action === 'answer') {
      const answerInput = new TextInputBuilder()
        .setCustomId('memory_answer')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Type your answer here...')
        .setRequired(true)
        .setMaxLength(200);

      const labelText = (memory.question || 'Your Answer').slice(0, 45);

      const labelComponent = new LabelBuilder()
        .setLabel(labelText)
        .setTextInputComponent(answerInput);

      const modal = new ModalBuilder()
        .setCustomId(`memory_modal:${nodeId}`)
        .setTitle('Memory Challenge')
        .addLabelComponents(labelComponent);

      await interaction.showModal(modal);
      return;
    }

    if (action === 'hint') {
      incrementMemoryHintIndex(odId, nodeId);

      await interaction.deferUpdate();

      const party = getPartyByPlayer(odId);
      const result = await buildMemoryNode(currentNode, {
        playerId: odId,
        nodeId: currentNode.id,
      });

      const payload: any = {
        embeds: [result.embed],
        components: result.components ?? [],
      };

      if (result.attachment) {
        payload.files = [result.attachment];
      }

      await interaction.editReply(payload);
      return;
    }

    await interaction.reply({
      content: 'Unknown memory action.',
      flags: MessageFlags.Ephemeral,
    });
  },
};

export const modalHandler = {
  id: /^memory_modal:(.+)$/,
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

    const match = interaction.customId.match(/^memory_modal:(.+)$/);
    if (!match) {
      await interaction.reply({
        content: 'Invalid modal submission.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const [, nodeId] = match;

    const currentNode = session.storyData.nodes?.[nodeId];
    if (!currentNode || currentNode.type !== 'memory') {
      await interaction.reply({
        content: 'Memory node not found.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const memory = currentNode.type_specific?.memory;
    if (!memory) {
      await interaction.reply({
        content: 'Invalid memory configuration.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const answer = interaction.fields.getTextInputValue('memory_answer');
    const isCorrect = checkMemoryAnswer(
      answer,
      memory.correct_answers,
      memory.case_sensitive ?? false
    );

    await interaction.deferUpdate();

    if (isCorrect) {
      clearMemoryState(odId, nodeId);
      recordChoice(odId, `memory:${nodeId}:success`, memory.on_success ?? null);

      if (memory.on_success) {
        const nextNode = session.storyData.nodes?.[memory.on_success];
        if (nextNode) {
          const party = getPartyByPlayer(odId);
          const result = await renderNodeWithContext(nextNode, {
            playerId: odId,
            nodeId: nextNode.id,
            party,
          });

          const payload: any = {
            content: '**Correct!** You remembered correctly!',
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
        content: '**Correct!** You recalled the answer!',
        embeds: [],
        components: [],
      });
      return;
    }

    decrementMemoryAttempts(odId, nodeId);
    const remaining = getMemoryAttempts(odId, nodeId);

    if (remaining <= 0 && memory.on_failure) {
      clearMemoryState(odId, nodeId);
      recordChoice(odId, `memory:${nodeId}:failure`, memory.on_failure);

      const nextNode = session.storyData.nodes?.[memory.on_failure];
      if (nextNode) {
        const party = getPartyByPlayer(odId);
        const result = await renderNodeWithContext(nextNode, {
          playerId: odId,
          nodeId: nextNode.id,
          party,
        });

        const payload: any = {
          content: '**Failed!** No attempts remaining.',
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

    const party = getPartyByPlayer(odId);
    const result = await buildMemoryNode(currentNode, {
      playerId: odId,
      nodeId: currentNode.id,
    });

    await interaction.followUp({
      content: `**Wrong!** ${remaining > 0 ? `${remaining} attempts remaining.` : 'No attempts left!'}`,
      flags: MessageFlags.Ephemeral,
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
