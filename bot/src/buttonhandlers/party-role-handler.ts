import {
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { mapRemotePartyToLocal } from '../quickstart/party-session.js';
import * as api from '../api/client.js';

const AVAILABLE_ROLES = [
  { id: 'scout', label: 'Scout', emoji: '🔍' },
  { id: 'leader', label: 'Leader', emoji: '👑' },
  { id: 'healer', label: 'Healer', emoji: '💚' },
  { id: 'warrior', label: 'Warrior', emoji: '⚔️' },
];

export const handler = {
  id: /^party_role:([\w-]+):(.+)$/,
  async execute(interaction: any) {
    await interaction.deferUpdate();
    
    const discordId = interaction.user.id;
    const match = interaction.customId.match(/^party_role:([\w-]+):(.+)$/);
    
    if (!match) {
        await interaction.followUp({ content: 'Invalid role selection data.', flags: MessageFlags.Ephemeral });
        return;
    }
    
    const partyId = match[1];
    const roleId = match[2];
    
    const roleInfo = AVAILABLE_ROLES.find((r) => r.id === roleId);
    if (!roleInfo) {
      await interaction.followUp({ content: 'Unknown role.', flags: MessageFlags.Ephemeral });
      return;
    }

    // Early check: fetch party to see if story has started
    const preCheckParty = await api.getParty(discordId, partyId);
    if (preCheckParty.data?.party?.status === 'active') {
      await interaction.followUp({ 
        content: '🔒 Cannot change roles after the story has started.', 
        flags: MessageFlags.Ephemeral 
      });
      return;
    }
    
    // Call API to set role
    const result = await api.setPartyRole(discordId, partyId, roleId);
    
    if (result.error) {
      await interaction.followUp({ content: result.error, flags: MessageFlags.Ephemeral });
      return;
    }
    
    // Refresh UI to show new roles
    const partyResponse = await api.getParty(discordId, partyId);
    if (partyResponse.error || !partyResponse.data?.party) {
      await interaction.followUp({ content: 'Party not found.', flags: MessageFlags.Ephemeral });
      return;
    }
    
    const party = mapRemotePartyToLocal(partyResponse.data.party);
    const maxSize = party.maxSize || 4;
    
    if (party.status !== 'waiting' && party.status !== 'forming') {
        await interaction.followUp({ content: 'Cannot change roles after party has started.', flags: MessageFlags.Ephemeral });
        return;
    }
    
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
      
    // Rebuild rows
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
    
    await interaction.followUp({ 
        content: `${roleInfo.emoji} You are now the **${roleInfo.label}**!`, 
        flags: MessageFlags.Ephemeral 
    });
  },
};

export function buildRoleSelectionRow(
  partyId: string
): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();
  for (const role of AVAILABLE_ROLES) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`party_role:${partyId}:${role.id}`)
        .setLabel(role.label)
        .setEmoji(role.emoji)
        .setStyle(ButtonStyle.Secondary)
    );
  }
  return row;
}

export function getAvailableRoles() {
  return AVAILABLE_ROLES;
}
