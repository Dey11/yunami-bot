import {
  getPartyByOwner,
  invitePlayerToParty,
} from '../../quickstart/party-session.js';
import { MessageFlags } from 'discord.js';
import * as api from '../../api/client.js';

export const handler = {
  id: /^accept_party_invite:/,
  async execute(interaction: any) {
    const user = interaction.user.id;
    if (!user) return;
    
    const parts = interaction.customId.split(':');
    const leaderId = parts[1];
    const invitedUserId = parts[2];
    
    if (!leaderId || !invitedUserId) {
      await interaction.reply({
        content: 'Something went wrong',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    
    if (interaction.user.id !== invitedUserId) {
      await interaction.reply({
        content: 'This invite is not for you.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    
    let party = await getPartyByOwner(leaderId);
    
    // API Fallback if local party not found
    if (!party) {
        const partyRes = await api.getMyParty(leaderId);
        if (partyRes.data?.party) {
             const { mapRemotePartyToLocal, restorePartySession } = await import('../../quickstart/party-session.js');
             party = mapRemotePartyToLocal(partyRes.data.party) as any;
             if (party) {
                restorePartySession(party);
             }
        }
    }

    if (!party) {
      await interaction.reply({
        content: `Party not found or is no longer accepting invites`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Sync with server API
    const inviteCode = party.inviteCode;
    if (inviteCode) {
      const apiResult = await api.joinParty(interaction.user.id, inviteCode);
      if (apiResult.error) {
        await interaction.editReply({
          content: `Failed to join party: ${apiResult.error}`,
        });
        return;
      }
    }

    // Also update local party for runtime access
    const invitedPlayer = await invitePlayerToParty(
      party.id,
      interaction.user.id,
      interaction.user.username
    );
    
    if (!invitedPlayer.success) {
      await interaction.editReply({
        content: invitedPlayer.message,
      });
      return;
    }
    
    await interaction.editReply({
      content: `You've joined **${party.name}**! Use \`/party-lobby\` to see the party status.`,
    });
    
    await interaction.channel?.send(`👋 **${interaction.user.username}** has joined the party!`);
  },
};

