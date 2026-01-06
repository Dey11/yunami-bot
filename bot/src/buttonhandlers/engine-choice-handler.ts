import { MessageFlags } from 'discord.js';
import {
  getSession,
  recordChoice,
  lockChoice,
  isChoiceLocked,
  getResource,
  modifyResource,
  setActiveMessage,
  getVote,
  recordVote,
  isTimerExpired,
} from '../quickstart/runtime-graph.js';
import { getPartyByPlayer } from '../quickstart/party-session.js';
import { renderNodeWithContext } from '../engine/dispatcher.js';
import { recordPlayerInput } from '../engine/outcome-engine.js';
import type { Choice, TraitMapping } from '../engine/types.js';
import {
  recordPrologueChoice,
  isPrologueActive,
  finalizePrologueProfile,
} from '../engine/prologue-evaluator.js';
import { isPlayerInSoloArc, getPlayerArc, updateArcNode } from '../engine/arc-manager.js';
import * as api from '../api/client.js';

export const handler = {
  id: /^choice:(.+):(.+)$/,
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
      if (isTimerExpired(odId, timerId)) {
        await interaction.reply({
          content: "⏱️ Time's up! Voting has ended.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const existingVote = getVote(odId, nodeId);
      if (existingVote) {
        await interaction.reply({
          content: 'You have already voted on this decision.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    } else if (isChoiceLocked(odId, nodeId, choiceId)) {
      await interaction.reply({
        content: 'You have already made this choice.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (choice.cost) {
      for (const [resource, amount] of Object.entries(choice.cost)) {
        if (getResource(odId, resource) < amount) {
          await interaction.reply({
            content: `Not enough ${resource}. Required: ${amount}, available: ${getResource(odId, resource)}.`,
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

    if (choice.cost) {
      for (const [resource, amount] of Object.entries(choice.cost)) {
        modifyResource(odId, resource, -amount);
      }
    }

    lockChoice(odId, nodeId, choiceId);
    recordChoice(odId, choiceId, choice.nextNodeId ?? null);

    if (isPrologueActive(odId)) {
      const traitMappings: TraitMapping = session.storyData.traitMappings || {};
      recordPrologueChoice(odId, choiceId, traitMappings);

      await api.submitPrologueChoice(odId, nodeId, choiceId, choice.nextNodeId ?? '');
    }

    if (isTimedNode) {
      recordVote(odId, nodeId, choiceId);
    }

    const party = getPartyByPlayer(odId);
    const partyId = party?.id;
    
    // Check if player is in a solo arc (no voting needed)
    const inSoloArc = isPlayerInSoloArc(partyId, odId);
    
    recordPlayerInput(nodeId, odId, { choiceId }, partyId);

    // Check if this is the final node (no nextNodeId)
    if (!choice.nextNodeId || choice.nextNodeId === null) {
      // Check if this is the prologue story
      if (session.storyId === 'prologue_1') {
        // Finalize the prologue profile first
        const prologueResult = finalizePrologueProfile(odId);
        
        if (prologueResult) {
          const completeResult = await api.completePrologue(odId, {
            baseStats: prologueResult.baseStats,
            personalityType: prologueResult.personalityType,
            startingInventory: prologueResult.startingInventory,
            dominantTraits: prologueResult.dominantTraits,
            personalityDescription: prologueResult.personalityDescription
          });
          
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
        }
      } else {
        // End regular story
        await api.endStory(odId, session.storyId);
        
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
          playerId: odId,
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
            odId,
            interaction.message.channelId,
            interaction.message.id
          );
        } else {
          const reply = await interaction.editReply(payload);
          setActiveMessage(odId, reply.channelId, reply.id);
        }
      } else if (isPrologueActive(odId) && !choice.nextNodeId) {
        const result = finalizePrologueProfile(odId);
        if (result) {
          await api.completePrologue(odId, {
             baseStats: result.baseStats,
             personalityType: result.personalityType,
             startingInventory: result.startingInventory,
             dominantTraits: result.dominantTraits,
             personalityDescription: result.personalityDescription
          });
          
          await interaction.followUp({
            content: `**Prologue Complete!**\nYou are **${result.personalityType}**: ${result.personalityDescription}\nUse \`/profile\` to see your stats!`,
            ephemeral: true
          });
        }
      }

      }
    }
};