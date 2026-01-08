import { MessageFlags } from 'discord.js';
import * as api from '../api/client.js';
import { removePlayerFromParty, getPartyByPlayer } from '../quickstart/party-session.js';

export const handler = {
  id: /^party_leave:([\w-]+)$/,
  async execute(interaction: any) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    const discordId = interaction.user.id;
    const match = interaction.customId.match(/^party_leave:([\w-]+)$/);
    
    let partyId: string | undefined;
    
    if (match) {
        partyId = match[1];
    } else {
        const partyRes = await api.getMyParty(discordId);
        partyId = partyRes.data?.party?.id;
    }
    
    if (!partyId) {
      await interaction.editReply({ content: 'You are not in a party.' });
      return;
    }
    
    // Leave via API
    const result = await api.leaveParty(discordId, partyId);
    
    // Also clear local state
    const localParty = getPartyByPlayer(discordId);
    if (localParty) {
      removePlayerFromParty(localParty.id, discordId);
    }
    
    if (result.error) {
      await interaction.editReply({ content: `Failed to leave party: ${result.error}` });
      return;
    }
    
    await interaction.editReply({ content: '👋 You have left the party.' });
    
    await interaction.channel?.send(`👋 **${interaction.user.username}** has left the party.`);
    
  },
};
