import { SlashCommandBuilder } from "discord.js";
import { partyInviteButton } from "../../components/buttons/party-invite.js";
import { getPartyByOwner } from "../../quickstart/party-session.js";
import { MessageFlags } from "discord.js";

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

  const party = await getPartyByOwner(interaction.user.id);

  if (!party) {
    await interaction.reply({
      content: "You don't have a party yet",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply({
    content: `${interaction.user.username} invited ${user.toString()} to join their party: **${party.name}**`,
    components: [partyInviteButton(interaction.user.id, user.id)],
  });
}
