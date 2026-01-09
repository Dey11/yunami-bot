import { MessageFlags, TextChannel } from 'discord.js';
import {
  getSession,
  recordChoice,
  setActiveMessage,
  getActiveMessage,
} from '../quickstart/runtime-graph.js';
import { getPartyByPlayer, mapRemotePartyToLocal, restorePartySession, getPartyMessage, setPartyMessage } from '../quickstart/party-session.js';
import { renderNodeWithContext } from '../engine/dispatcher.js';
import * as api from '../api/client.js';

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
    
    // If in a party, update the shared party message
    if (party && party.status === 'active') {
      const partyMsg = getPartyMessage(party.id);
      if (partyMsg) {
        try {
          const channel = await interaction.client.channels.fetch(partyMsg.channelId) as TextChannel;
          const msg = await channel.messages.fetch(partyMsg.messageId);
          await msg.edit(payload);
          // Also update per-player for backwards compatibility
          for (const p of party.players) {
            setActiveMessage(p.odId, partyMsg.channelId, partyMsg.messageId);
          }
          return;
        } catch (err) {
          console.warn('[EngineContinue] Failed to update shared party message:', err);
        }
      }
    }
    
    // Fallback: update normally (solo play or no shared message)
    await interaction.editReply(payload);
    setActiveMessage(
      userId,
      interaction.message.channelId,
      interaction.message.id
    );
  },
};

