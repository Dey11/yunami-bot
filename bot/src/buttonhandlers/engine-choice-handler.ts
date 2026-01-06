import { MessageFlags } from 'discord.js';
import {
  getSession,
  lockChoice,
  isChoiceLocked,
  getResource,
  modifyResource,
  setActiveMessage,
  getVote,
  recordVote,
  isTimerExpired,
  initSession,
} from '../quickstart/runtime-graph.js';
import { getPartyByPlayer } from '../quickstart/party-session.js';
import { renderNodeWithContext } from '../engine/dispatcher.js';
import { recordPlayerInput } from '../engine/outcome-engine.js';
import { isPlayerInSoloArc, getPlayerArc, updateArcNode } from '../engine/arc-manager.js';
import type { Choice } from '../engine/types.js';
import * as api from '../api/client.js';

export const handler = {
  id: /^choice:(.+):(.+)$/,
  async execute(interaction: any) {
    const discordId = interaction.user.id;
    let session = getSession(discordId);

    // If no local session, try to restore from backend
    if (!session) {
      // Get user's current story state from backend
      const userResponse = await api.getUser(discordId);
      if (userResponse.error || !userResponse.data?.progress?.length) {
        await interaction.reply({
          content: 'No active session. Please start a new story.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Find active story progress
      const activeProgress = userResponse.data.progress.find(
        (p: any) => p.status === 'active'
      );
      if (!activeProgress) {
        await interaction.reply({
          content: 'No active session. Please start a new story.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Fetch story and restore session
      const storyResponse = await api.getStory(discordId, activeProgress.storyId);
      if (storyResponse.error || !storyResponse.data?.story) {
        await interaction.reply({
          content: 'Failed to load story data.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const storyData = storyResponse.data.story;
      session = initSession(
        discordId,
        storyData.id,
        activeProgress.currentNodeId,
        storyData
      );
    }

    const [, nodeId, choiceId] =
      interaction.customId.match(/^choice:(.+):(.+)$/) || [];

    if (!nodeId || !choiceId) {
      await interaction.reply({
        content: 'Invalid choice format.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const currentNode = session.storyData.nodes?.[nodeId];
    if (!currentNode) {
      await interaction.reply({
        content: 'Node not found.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const choices: Choice[] = currentNode.type_specific?.choices || [];
    const choice = choices.find((c: Choice) => c.id === choiceId);

    if (!choice) {
      await interaction.reply({
        content: 'Choice not found.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const isTimedNode = currentNode.type === 'timed';

    if (isTimedNode) {
      const timerId = `${nodeId}:timer`;
      if (isTimerExpired(discordId, timerId)) {
        await interaction.reply({
          content: "⏱️ Time's up! Voting has ended.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const existingVote = getVote(discordId, nodeId);
      if (existingVote) {
        await interaction.reply({
          content: 'You have already voted on this decision.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    } else if (isChoiceLocked(discordId, nodeId, choiceId)) {
      await interaction.reply({
        content: 'You have already made this choice.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (choice.cost) {
      for (const [resource, amount] of Object.entries(choice.cost)) {
        if (getResource(discordId, resource) < amount) {
          await interaction.reply({
            content: `Not enough ${resource}. Required: ${amount}, available: ${getResource(discordId, resource)}.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      }
    }

    if (choice.ephemeral_confirmation || isTimedNode) {
      await interaction.reply({
        content: `You chose: **${choice.label}**. Your vote has been recorded.`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.deferUpdate();
    }

    // Apply costs locally
    if (choice.cost) {
      for (const [resource, amount] of Object.entries(choice.cost)) {
        modifyResource(discordId, resource, -amount);
      }
    }

    lockChoice(discordId, nodeId, choiceId);

    // Record choice on backend
    await api.submitChoice(
      discordId,
      session.storyId,
      nodeId,
      choiceId,
      choice.nextNodeId ?? nodeId
    );

    if (isTimedNode) {
      recordVote(discordId, nodeId, choiceId);
    }

    const party = getPartyByPlayer(discordId);
    const partyId = party?.id;
    
    // Check if player is in a solo arc (no voting needed)
    const inSoloArc = isPlayerInSoloArc(partyId, discordId);
    
    recordPlayerInput(nodeId, discordId, { choiceId }, partyId);

    // Check if this is the final node (no nextNodeId)
    if (!choice.nextNodeId || choice.nextNodeId === null) {
      // Check if this is the prologue story
      if (session.storyId === 'prologue_1') {
        // Complete prologue and get role
        const completeResult = await api.completePrologue(discordId);
        
        if (completeResult.data) {
          const { user, roleDescription } = completeResult.data;
          const embed = {
            title: '🎭 Prologue Complete!',
            description: `Your journey has shaped who you are.\n\n**Your Role: ${user.role?.toUpperCase()}**\n\n${roleDescription}`,
            color: 0x00b3b3,
            footer: { text: 'You can now join multiplayer parties!' },
          };
          
          if (choice.ephemeral_confirmation) {
            await interaction.message.edit({ embeds: [embed], components: [] });
          } else {
            await interaction.editReply({ embeds: [embed], components: [] });
          }
        }
      } else {
        // End regular story
        await api.endStory(discordId, session.storyId);
        
        const embed = {
          title: '📖 Story Complete!',
          description: 'Your journey has come to an end... for now.',
          color: 0x00b3b3,
        };
        
        if (choice.ephemeral_confirmation) {
          await interaction.message.edit({ embeds: [embed], components: [] });
        } else {
          await interaction.editReply({ embeds: [embed], components: [] });
        }
      }
      return;
    }

    // For solo arc OR non-timed nodes: process choice immediately
    // Solo arc players don't need to wait for voting
    if ((inSoloArc || !isTimedNode) && choice.nextNodeId) {
      // Update local session to next node
      session.currentNodeId = choice.nextNodeId;

      const nextNode = session.storyData.nodes?.[choice.nextNodeId];
      if (nextNode) {
        const context = {
          playerId: discordId,
          nodeId: nextNode.id,
          party,
        };
        const result = await renderNodeWithContext(nextNode, context);
        const payload: any = {
          embeds: [result.embed],
          components: result.components ?? [],
        };
        if (result.attachment) payload.files = [result.attachment];

        if (choice.ephemeral_confirmation) {
          await interaction.message.edit(payload);
          setActiveMessage(
            discordId,
            interaction.message.channelId,
            interaction.message.id
          );
        } else {
          const reply = await interaction.editReply(payload);
          setActiveMessage(discordId, reply.channelId, reply.id);
        }
      }
    }
  },
};

