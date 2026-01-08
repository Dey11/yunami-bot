import { Client, TextChannel, MessagePayload, InteractionReplyOptions } from 'discord.js';
import { MultiplayerSession } from '../types/party.js';
import { getActiveMessage } from '../quickstart/runtime-graph.js';
export async function broadcastMergeUpdate(
  client: Client,
  party: MultiplayerSession,
  payload: any, // Using any for the payload as it can be complex embed/component structure
  excludeUserId?: string
) {
  const promises = party.players.map(async (player) => {
    if (excludeUserId && player.odId === excludeUserId) {
      // console.log(`[party-broadcast] Skipping update for triggering user ${player.odId}`);
      return;
    }

    const activeMsg = getActiveMessage(player.odId);
    if (!activeMsg) return;

    try {
      const channel = await client.channels.fetch(activeMsg.channelId) as TextChannel;
      if (!channel) return;

      const message = await channel.messages.fetch(activeMsg.messageId);
      if (!message) return;

      // We want to edit the message to show the reunion screen
      await message.edit(payload);
    } catch (error: any) {
      // Ignore Unknown Message (10008) as it likely means the message was ephemeral or deleted
      if (error.code === 10008 || error.status === 404) {
         // console.debug(`[party-broadcast] Could not find message for player ${player.odId} (likely ephemeral)`);
         return;
      }
      console.warn(`[party-broadcast] Failed to update message for player ${player.odId}:`, error);
    }
  });

  await Promise.all(promises);
}
