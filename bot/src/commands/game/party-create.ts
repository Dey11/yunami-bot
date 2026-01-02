import { SlashCommandBuilder } from 'discord.js';
import {
  createParty,
  getPartyByPlayer,
} from '../../quickstart/party-session.js';
import { MessageFlags } from 'discord.js';

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

  const existingParty = getPartyByPlayer(interaction.user.id);
  if (existingParty) {
    await interaction.reply({
      content: `You are already in a party named "${existingParty.name}". You cannot create a new one.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const party = createParty(
    interaction.user.id,
    interaction.user.username,
    name,
    size
  );
  await interaction.reply({
    content: `Created a party named ${name} with ${size} players by ${party.ownerId}`,
  });
}
