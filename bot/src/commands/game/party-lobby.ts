import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { getPartyByPlayer } from '../../quickstart/party-session.js';
import { buildRoleSelectionRow } from '../../buttonhandlers/party-role-handler.js';
export const data = new SlashCommandBuilder()
  .setName('party-lobby')
  .setDescription('View party lobby and ready up');
export async function execute(interaction: any) {
  if (!interaction.isChatInputCommand()) return;
  const party = getPartyByPlayer(interaction.user.id);
  if (!party) {
    await interaction.reply({
      content: 'You are not in a party.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
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
    .setFooter({ text: `Players: ${party.players.length}/${party.maxSize}` });
  const readyRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
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
