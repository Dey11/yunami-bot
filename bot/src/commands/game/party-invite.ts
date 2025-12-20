import { SlashCommandBuilder } from "discord.js";
import { partyInviteButton } from "../../components/buttons/party-invite.js";

export const data = new SlashCommandBuilder()
  .setName("party-invite")
  .setDescription("Invite a user to your party")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("The user to invite")
      .setRequired(true)
  );

export async function execute(interaction: any) {
  if (!interaction.isChatInputCommand()) return;
  const user = interaction.options.getUser("user");
  if (!user) return;

  await interaction.reply({
    content: `${interaction.username} invited ${user.toString()} to your party`,
    components: [partyInviteButton(interaction.user.id)],
  });
}
