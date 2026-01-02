import {
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import {
  getPartyByPlayer,
  setPlayerRole,
} from '../quickstart/party-session.js';
import { setPartyRole } from '../quickstart/runtime-graph.js';

const AVAILABLE_ROLES = [
  { id: 'scout', label: 'Scout', emoji: '🔍' },
  { id: 'leader', label: 'Leader', emoji: '👑' },
  { id: 'healer', label: 'Healer', emoji: '💚' },
  { id: 'warrior', label: 'Warrior', emoji: '⚔️' },
];

export const handler = {
  id: /^party_role:(.+)$/,
  async execute(interaction: any) {
    const odId = interaction.user.id;
    const party = getPartyByPlayer(odId);

    if (!party) {
      await interaction.reply({
        content: 'You are not in a party.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (party.status !== 'waiting') {
      await interaction.reply({
        content: 'Cannot change roles after party has started.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const match = interaction.customId.match(/^party_role:(.+)$/);
    if (!match) {
      await interaction.reply({
        content: 'Invalid role selection.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const roleId = match[1];
    const roleInfo = AVAILABLE_ROLES.find((r) => r.id === roleId);

    if (!roleInfo) {
      await interaction.reply({
        content: 'Unknown role.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const existingPlayer = party.players.find(
      (p) => p.role === roleId && p.odId !== odId
    );
    if (existingPlayer) {
      await interaction.reply({
        content: `${roleInfo.emoji} **${roleInfo.label}** is already taken by ${existingPlayer.username}.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    setPlayerRole(party.id, odId, roleId);
    setPartyRole(odId, roleId);

    await interaction.reply({
      content: `${roleInfo.emoji} You are now the **${roleInfo.label}**!`,
      flags: MessageFlags.Ephemeral,
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
        .setCustomId(`party_role:${role.id}`)
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
