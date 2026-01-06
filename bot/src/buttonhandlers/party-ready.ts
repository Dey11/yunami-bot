import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import * as api from '../api/client.js';
export const handler = {
  id: [/^party_toggle_ready:(true|false)$/, 'refresh_lobby'],
  async execute(interaction: any) {
    const discordId = interaction.user.id;
    const userResponse = await api.getUser(discordId);
    if (userResponse.error) {
      await interaction.reply({
        content: 'Failed to get user data.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const message = interaction.message;
    const embed = message?.embeds?.[0];
    const footerText = embed?.footer?.text || '';
    const partyIdMatch = footerText.match(/Party ID: (\w+)/);
    if (!partyIdMatch) {
      await interaction.reply({
        content: 'Could not find party information. Please rejoin the party.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const partyId = partyIdMatch[1];
    if (interaction.customId !== 'refresh_lobby') {
      const isReady = interaction.customId.split(':')[1] === 'true';
      const readyResult = await api.setReady(discordId, partyId, isReady);
      if (readyResult.error) {
        await interaction.reply({
          content: `Failed to update ready status: ${readyResult.error}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }
    const partyResponse = await api.getParty(discordId, partyId);
    if (partyResponse.error || !partyResponse.data?.party) {
      await interaction.reply({
        content: 'Party not found.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const party = partyResponse.data.party;
    const partyEmbed = new EmbedBuilder()
      .setTitle(`Party Lobby`)
      .setDescription(`Invite Code: **${party.code}**\nWaiting for all players to be ready...`)
      .setColor(0x00b3b3)
      .addFields(
        party.members.map((m: any) => ({
          name: m.user.username,
          value: m.isReady ? '✅ Ready' : '⬜ Not Ready',
          inline: true,
        }))
      )
      .setFooter({ text: `Players: ${party.members.length}/4 | Party ID: ${party.id}` });
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('party_toggle_ready:true')
        .setLabel('Ready Up')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('party_toggle_ready:false')
        .setLabel('Not Ready')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('refresh_lobby')
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Primary)
    );
    await interaction.update({
      embeds: [partyEmbed],
      components: [row],
    });
  },
};
