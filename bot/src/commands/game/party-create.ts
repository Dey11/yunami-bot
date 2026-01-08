import { SlashCommandBuilder } from 'discord.js';
import {
  createParty,
  getPartyByPlayer,
} from '../../quickstart/party-session.js';
import { MessageFlags } from 'discord.js';
import * as api from '../../api/client.js';

export const data = new SlashCommandBuilder()
  .setName('party-create')
  .setDescription('Create a party')
  .addStringOption((option) =>
    option
      .setName('name')
      .setDescription('The name of the party')
      .setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName('size')
      .setDescription('How many players do you want in the team?')
      .setRequired(true)
      .setMinValue(2)
      .setMaxValue(4)
  );

export async function execute(interaction: any) {
  if (!interaction.isChatInputCommand()) return;
  
  const name = interaction.options.getString('name');
  const size = interaction.options.getInteger('size');
  const discordId = interaction.user.id;
  
  // Check if user is already in a local party
  const existingLocalParty = getPartyByPlayer(discordId);
  if (existingLocalParty) {
    await interaction.reply({
      content: `You are already in a party named "${existingLocalParty.name}". You cannot create a new one.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  
  // Check if user is in a remote party
  const partyRes = await api.getMyParty(discordId);
  if (partyRes.data?.party) {
    await interaction.reply({
        content: `You are already in a party (${partyRes.data.party.name || 'Party'}). Leave it first with the 'Leave Party' button in \`/party-lobby\`.`,
        flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Create party on server for persistence
  const apiResult = await api.createParty(discordId, name, size);
  if (apiResult.error) {
    await interaction.editReply({
      content: `Failed to create party: ${apiResult.error}`,
    });
    return;
  }

  // Also create local party for fast runtime access
  const localParty = createParty(
    discordId,
    interaction.user.username,
    name,
    size,
    apiResult.data?.party?.id
  );

  // Sync invite code
  localParty.inviteCode = apiResult.data?.party?.code;

  await interaction.editReply({
    content: `Created party **${name}** (${size} players max)!\n\nInvite friends with \`/party-invite\ .`,
  });
}

