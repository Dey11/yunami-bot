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
import { getPartyByPlayer, getPartyMessage, setPartyMessage } from '../quickstart/party-session.js';
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
    const { restoreSession } = await import('../quickstart/runtime-graph.js');
    const { mapRemotePartyToLocal, restorePartySession } = await import('../quickstart/party-session.js');

    let session = getSession(odId);
    if (!session) {
      try {
        const sessionRes = await api.getSession(odId);
        if (sessionRes.data?.session) {
            session = restoreSession(sessionRes.data.session);
        }
      } catch (e) {
        console.error("Failed to restore session", e);
      }
    }

    if (!session) {
      await interaction.reply({
        content: 'No active session. Please start a new story.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    
    // Ensure Party is also restored
    let party = getPartyByPlayer(odId);
    if (!party) {
         try {
             const partyRes = await api.getMyParty(odId);
             if (partyRes.data?.party) {
                 const restoredParty = mapRemotePartyToLocal(partyRes.data.party);
                 restorePartySession(restoredParty);
                 party = restoredParty as any;
             }
         } catch (e) {
             console.error("Failed to restore party", e);
         }
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
    // Party already retrieved at top of function
    const partyId = party?.id;
    const inSoloArc = isPlayerInSoloArc(partyId, odId);

    const isTimedNode = currentNode.type === 'timed' && !inSoloArc; // Disable timed logic for solo arcs
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
    if ((choice.ephemeral_confirmation || isTimedNode) && !inSoloArc) {
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
    recordPlayerInput(nodeId, odId, { choiceId }, partyId);
    
    // Early vote completion: only for 3+ player parties when all have voted
    // For 2-player parties, always wait for timer (leader decides ties)
    if (isTimedNode && party && party.status === 'active' && party.players.length >= 3) {
      const { hasAllInputs, getNodeInputs, evaluateOutcome, clearNodeInputs } = await import('../engine/outcome-engine.js');
      const { clearTimer, getActiveMessage, setActiveMessage } = await import('../quickstart/runtime-graph.js');
      const { TextChannel } = await import('discord.js');
      
      const expectedPlayerIds = party.players.map(p => p.odId);
      const inputs = getNodeInputs(nodeId, partyId);
      const currentVoteCount = inputs?.playerInputs.size ?? 0;
      
      console.log(`[EarlyVote] Node: ${nodeId}, PartyId: ${partyId}`);
      console.log(`[EarlyVote] Party player count: ${party.players.length}`);
      console.log(`[EarlyVote] Expected: ${expectedPlayerIds.length}, Current: ${currentVoteCount}`);
      
      if (hasAllInputs(nodeId, expectedPlayerIds, partyId)) {
        // All players have voted - proceed immediately
        const inputs = getNodeInputs(nodeId, partyId);
        if (inputs) {
          const result = evaluateOutcome(currentNode, inputs, party);
          clearNodeInputs(nodeId, partyId);
          clearTimer(odId, `${nodeId}:timer`);
          
          if (result.nextNodeId) {
            const nextNode = session.storyData.nodes?.[result.nextNodeId];
            if (nextNode) {
              const context = { playerId: odId, nodeId: nextNode.id, party };
              const renderResult = await renderNodeWithContext(nextNode, context);
              const payload: any = {
                content: result.message ? `🗳️ ${result.message}` : undefined,
                embeds: [renderResult.embed],
                components: renderResult.components ?? [],
              };
              if (renderResult.attachment) payload.files = [renderResult.attachment];
              
              // Use shared party message
              const partyMsg = getPartyMessage(partyId!);
              if (partyMsg) {
                try {
                  const channel = await interaction.client.channels.fetch(partyMsg.channelId) as typeof TextChannel.prototype;
                  const msg = await channel.messages.fetch(partyMsg.messageId);
                  await msg.edit(payload);
                  // Update party's shared message reference (in case message ID changed)
                  setPartyMessage(partyId!, partyMsg.channelId, partyMsg.messageId, odId);
                  // Also update per-player for backwards compatibility
                  for (const p of party.players) {
                    setActiveMessage(p.odId, partyMsg.channelId, partyMsg.messageId);
                  }
                } catch (err) {
                  console.warn('[EarlyVoteComplete] Failed to update shared message:', err);
                }
              }
            }
          }
          return; // Exit early, vote completed
        }
      }
    }
    
    if (!choice.nextNodeId || choice.nextNodeId === null) {
      if (session.storyId === 'prologue_1') {
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
            if (choice.ephemeral_confirmation && !inSoloArc) {
              await interaction.message.edit({ embeds: [embed], components: [] });
            } else {
              await interaction.editReply({ embeds: [embed], components: [] });
            }
          }
        }
      } else {
        await api.endStory(odId, session.storyId);
        const embed = {
          title: '📖 Story Complete!',
          description: 'Your journey has come to an end... for now.',
          color: 0x00b3b3,
        };
        if (choice.ephemeral_confirmation && !inSoloArc) {
          await interaction.message.edit({ embeds: [embed], components: [] });
        } else {
          await interaction.editReply({ embeds: [embed], components: [] });
        }
      }
      return;
    }
    if ((inSoloArc || !isTimedNode) && choice.nextNodeId) {
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
        
        // If in a party, update the shared party message
        if (party && party.status === 'active' && !inSoloArc) {
          const partyMsg = getPartyMessage(party.id);
          if (partyMsg) {
            try {
              const { TextChannel } = await import('discord.js');
              const channel = await interaction.client.channels.fetch(partyMsg.channelId) as typeof TextChannel.prototype;
              const msg = await channel.messages.fetch(partyMsg.messageId);
              await msg.edit(payload);
              // Also update per-player for backwards compatibility
              for (const p of party.players) {
                setActiveMessage(p.odId, partyMsg.channelId, partyMsg.messageId);
              }
              await interaction.editReply({ content: '✓' }).catch(() => {}); // Acknowledge the interaction
              return;
            } catch (err) {
              console.warn('[ChoiceHandler] Failed to update shared party message:', err);
            }
          }
        }
        
        // Fallback: update normally (solo play or solo arc)
        if (choice.ephemeral_confirmation && !inSoloArc) {
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
      }
    }
  }
};
