import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { registerButtons } from "../../components/buttons/register.buttons";

export const data = new SlashCommandBuilder()
  .setName("createprofile")
  .setDescription("Create your profile with Yunami.");

export async function execute(interaction: any) {
  if (!interaction.isChatInputCommand()) return;
  const botUser = interaction.client.user;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("Yunami Registration")
    .setDescription(
      "Welcome to **Yunami** – a co-op, turn-based anime adventure for up to **4 players**.\n" +
        "Use this panel to understand how to register and start your journey."
    )
    .setThumbnail(botUser?.displayAvatarURL() ?? null)
    .addFields(
      {
        name: "🧾 What is Yunami?",
        value:
          "• Turn-based co-op combat against iconic anime-inspired bosses.\n" +
          "• Progress through branching stories with your party.\n" +
          "• Earn rewards, unlock routes, and build your team.",
      },
      {
        name: "How to Register",
        value:
          "1. Use `/profile create` to create your character.\n" +
          "2. Use `/party create` to start a party.\n" +
          "3. Invite friends with `/party invite @user`.\n" +
          "4. Once 2–4 players join, start a run with `/story start`.",
      },
      {
        name: "Gameplay Basics",
        value:
          "• Combat is **turn-based** – each player acts on their turn.\n" +
          "• Coordinate skills and ultimates to defeat bosses.\n" +
          "• Choices in dialogue affect story branches and rewards.",
      },
      {
        name: "Requirements",
        value:
          "• You must have a registered profile.\n" +
          "• You must be in a party to start a multiplayer run.\n" +
          "• Only the party leader can start or end runs.",
      },
      {
        name: "❓ Need Help?",
        value:
          "Use `/help` for command details or ping a moderator if you’re stuck.",
      }
    )
    .setFooter({
      text: "Yunami • Co-op Anime Adventures",
    })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], components: [registerButtons] });
}
