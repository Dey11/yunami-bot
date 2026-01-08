import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { partyInviteButton } from '../../components/buttons/party-invite.js';
import { getPartyByOwner, mapRemotePartyToLocal } from '../../quickstart/party-session.js';
import * as api from '../../api/client.js';

export const data = new SlashCommandBuilder()
  .setName('party-invite')
  .setDescription('Invite a user to your party')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The user to invite')
      .setRequired(true)
  );

export async function execute(interaction: any) {
  if (!interaction.isChatInputCommand()) return;
  
  const user = interaction.options.getUser('user');
  if (!user) return;
  
  if (user.id === interaction.user.id) {
    await interaction.reply({
      content: "You cannot invite yourself to the party.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (user.bot) {
    await interaction.reply({
      content: "You cannot invite bots to the party.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  
  const discordId = interaction.user.id;
  let party = await getPartyByOwner(discordId);
  let isOwner = !!party;
  
  // If no local party, check API
  if (!party) {
    const partyRes = await api.getMyParty(discordId);
    const remoteParty = partyRes.data?.party;
    
    if (remoteParty) {
      const userMember = remoteParty.members.find((m: any) => m.user.discordId === discordId);
      if (userMember) {
        isOwner = remoteParty.leaderId === userMember.userId;
        party = mapRemotePartyToLocal(remoteParty) as any;
      }
    }
  }
  
  if (!party || !isOwner) {
    await interaction.reply({
      content: "You don't own a party. Create one with `/party-create` first.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  
  await interaction.reply({
    content: `${interaction.user.username} invited ${user.toString()} to join their party: **${party.name}**`,
    components: [partyInviteButton(interaction.user.id, user.id)],
  });
}
