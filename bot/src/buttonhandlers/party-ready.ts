import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import * as api from '../api/client.js';
import { mapRemotePartyToLocal } from '../quickstart/party-session.js';

export const handler = {
  id: [/^party_ready:([\w-]+):(true|false)$/, /^party_refresh:([\w-]+)$/],
  async execute(interaction: any) {
    await interaction.deferUpdate();
    
    const discordId = interaction.user.id;
    let partyId: string | undefined;
    let isReady: boolean | undefined;
    
    if (interaction.customId.startsWith('party_refresh:')) {
      const match = interaction.customId.match(/^party_refresh:([\w-]+)$/);
      partyId = match?.[1];
    } else {
      const match = interaction.customId.match(/^party_ready:([\w-]+):(true|false)$/);
      partyId = match?.[1];
      isReady = match?.[2] === 'true';
    }
    
    if (!partyId) {
       await interaction.followUp({
         content: 'Invalid interaction data.',
         flags: MessageFlags.Ephemeral,
       });
       return;
    }
    
    // Perform Action
    if (isReady !== undefined) {
      const readyResult = await api.setReady(discordId, partyId, isReady);
      if (readyResult.error) {
        await interaction.followUp({
          content: `Failed to update ready status: ${readyResult.error}`,
          flags: MessageFlags.Ephemeral,
        });
        // We still try to refresh the UI
      }
    }
    
    // Refresh UI
    const partyResponse = await api.getParty(discordId, partyId);
    if (partyResponse.error || !partyResponse.data?.party) {
      await interaction.followUp({
        content: 'Party not found or you are no longer a member.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    
    const party = mapRemotePartyToLocal(partyResponse.data.party);
    const maxSize = party.maxSize || 4;
    
    const getRoleDisplay = (role: string): string => {
      const roles: Record<string, string> = {
        scout: '🔍 Scout',
        leader: '👑 Leader',
        healer: '💚 Healer',
        warrior: '⚔️ Warrior',
      };
      return roles[role] || role || '⬜ No role';
    };
    
    const partyEmbed = new EmbedBuilder()
      .setTitle(`Party Lobby: ${party.name}`)
      .setDescription(`Waiting for all players to be ready...`)
      .setColor(0x00b3b3)
      .addFields(
        party.players.map((p) => ({
          name: p.username,
          value: `${p.role ? getRoleDisplay(p.role) : '⬜ No role'} | ${p.isReady ? '✅ Ready' : '⏳ Not Ready'}`,
          inline: true,
        }))
      )
      .setFooter({ text: `Players: ${party.players.length}/${maxSize}` });
      
    const { buildRoleSelectionRow } = await import('./party-role-handler.js');
    const roleRow = buildRoleSelectionRow(party.id);
    const readyRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`party_ready:${party.id}:true`)
        .setLabel('Ready Up')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`party_ready:${party.id}:false`)
        .setLabel('Not Ready')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`party_refresh:${party.id}`)
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`party_leave:${party.id}`)
        .setLabel('Leave Party')
        .setStyle(ButtonStyle.Danger)
    );
    
    await interaction.editReply({
      embeds: [partyEmbed],
      components: [roleRow, readyRow],
    });
  },
};
