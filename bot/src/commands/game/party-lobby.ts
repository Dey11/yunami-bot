import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { getPartyByPlayer, mapRemotePartyToLocal, restorePartySession } from '../../quickstart/party-session.js';
import { buildRoleSelectionRow } from '../../buttonhandlers/party-role-handler.js';
import * as api from '../../api/client.js';

export const data = new SlashCommandBuilder()
  .setName('party-lobby')
  .setDescription('View party lobby and ready up');

export async function execute(interaction: any) {
  if (!interaction.isChatInputCommand()) return;
  
  let party = getPartyByPlayer(interaction.user.id);
  
  // If no local party, try to sync from API
  if (!party) {
     console.log('[party-lobby] No local party, fetching from API...');
     const partyRes = await api.getMyParty(interaction.user.id);
     console.log('[party-lobby] API response:', JSON.stringify(partyRes, null, 2));
     const remoteParty = partyRes.data?.party;
     
     if (remoteParty && (remoteParty.status === 'waiting' || remoteParty.status === 'forming')) {
        console.log('[party-lobby] Found remote party:', remoteParty.id);
        party = mapRemotePartyToLocal(remoteParty) as any;
        // Save to local cache so ready status persists
        restorePartySession(party!);
     } else {
        console.log('[party-lobby] No valid remote party found');
     }
  }

  if (!party) {
    await interaction.reply({
      content: 'You are not in a party.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const maxSize = party.maxSize || 4;

  const embed = new EmbedBuilder()
    .setTitle(`Party Lobby: ${party.name}`)
    .setDescription('Select your role and ready up!')
    .setColor(0x00b3b3)
    .addFields(
      party.players.map((p) => ({
        name: p.username,
        value: `${p.role ? getRoleDisplay(p.role) : '⬜ No role'} | ${p.isReady ? '✅ Ready' : '⏳ Not Ready'}`,
        inline: true,
      }))
    )
    .setFooter({ text: `Players: ${party.players.length}/${maxSize}` });
  
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
  
  const roleRow = buildRoleSelectionRow(party.id);
  await interaction.reply({
    embeds: [embed],
    components: [roleRow, readyRow],
  });
}

function getRoleDisplay(role: string): string {
  const roles: Record<string, string> = {
    scout: '🔍 Scout',
    leader: '👑 Leader',
    healer: '💚 Healer',
    warrior: '⚔️ Warrior',
  };
  return roles[role] || role;
}
