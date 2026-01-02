import {
  getPartyByOwner,
  invitePlayerToParty,
} from '../../quickstart/party-session.js';
import { MessageFlags } from 'discord.js';

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
    const party = await getPartyByOwner(leaderId);

    if (!party) {
      await interaction.reply({
        content: `You don't have a party yet`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const invitedPlayer = await invitePlayerToParty(
      party.id,
      interaction.user.id,
      interaction.user.username
    );
    if (!invitedPlayer.success) {
      await interaction.reply({
        content: invitedPlayer.message,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await interaction.reply({
      content: `${interaction.user} accepted your party invite`,
    });
  },
};
