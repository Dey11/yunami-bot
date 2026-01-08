import { MessageFlags, TextChannel } from 'discord.js';
import {
  getSession,
  recordChoice,
  setActiveMessage,
  getActiveMessage,
} from '../quickstart/runtime-graph.js';
import { getPartyByPlayer, mapRemotePartyToLocal, restorePartySession } from '../quickstart/party-session.js';
import { renderNodeWithContext } from '../engine/dispatcher.js';
import * as api from '../api/client.js';
import { broadcastMergeUpdate } from '../helpers/party-broadcast.js';
import { ArcMergeResult } from '../engine/arc-merge-handler.js';

export const handler = {
  id: /^engine:continue:(.+)$/,
  async execute(interaction: any) {
    console.log(`[EngineContinue] Handler triggered for ${interaction.customId} by ${interaction.user.id}`);
    const match = interaction.customId.match(/^engine:continue:(.+)$/);
    if (!match) return;
    const nextNodeId = match[1];
    const userId = interaction.user.id;
    
    const { restoreSession } = await import('../quickstart/runtime-graph.js');

    let session = getSession(userId);
    if (!session) {
      try {
        const sessionRes = await api.getSession(userId);
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
    
    // Immediately disable buttons to prevent double-clicks
    await interaction.deferUpdate();
    const disabledComponents = interaction.message.components.map((row: any) => {
      const newRow = { ...row.toJSON() };
      newRow.components = newRow.components.map((c: any) => ({ ...c, disabled: true }));
      return newRow;
    });
    await interaction.editReply({ components: disabledComponents });
    
    // Ensure Party is also restored
    let party = getPartyByPlayer(userId);
    if (!party) {
         try {
             const partyRes = await api.getMyParty(userId);
             if (partyRes.data?.party) {
                 const restoredParty = mapRemotePartyToLocal(partyRes.data.party);
                 restorePartySession(restoredParty);
                 party = restoredParty as any;
             }
         } catch (e) {
             console.error("Failed to restore party", e);
         }
    }
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

    // Handle merge completion: update shared channel message
    if (nextNode.type === 'arc_merge' && (result as ArcMergeResult).allMerged && party) {

        for (const player of party.players) {
            const activeMsg = getActiveMessage(player.odId);
            if (activeMsg) {
                try {
                    const channel = await interaction.client.channels.fetch(activeMsg.channelId) as TextChannel;
                    if (channel) {
                        const message = await channel.messages.fetch(activeMsg.messageId);
                        if (message && !message.flags.has(MessageFlags.Ephemeral)) {
                            // Found a non-ephemeral shared message, update it
                            await message.edit(payload);
                            console.log(`[EngineContinue] Updated shared message ${activeMsg.messageId}`);
                            // Update all players' activeMessage to this shared message
                            for (const p of party.players) {
                                setActiveMessage(p.odId, activeMsg.channelId, activeMsg.messageId);
                            }
                            break;
                        }
                    }
                } catch (err: any) {
                    if (err.code !== 10008) {
                        console.warn(`[EngineContinue] Failed to update shared message:`, err);
                    }
                }
            }
        }
        
        // Also broadcast to other players' ephemeral messages
        await broadcastMergeUpdate(interaction.client, party, payload, userId);
    }
  },
};

