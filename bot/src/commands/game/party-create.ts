import { SlashCommandBuilder } from "discord.js";
import { createParty } from "../../quickstart/party.session.js";

export const data = new SlashCommandBuilder()
  .setName("party-create")
  .setDescription("Create a party")
  .addStringOption((option) =>
    option
      .setName("name")
      .setDescription("The name of the party")
      .setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName("size")
      .setDescription("How many players do you want in the team?")
      .setRequired(true)
      .setMinValue(2)
      .setMaxValue(4)
  );

export async function execute(interaction: any) {
  if (!interaction.isChatInputCommand()) return;
  const name = interaction.options.getString("name");
  const size = interaction.options.getInteger("size");
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
