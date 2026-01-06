import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { registerButtons } from '../../components/buttons/register-buttons.js';
export const data = new SlashCommandBuilder()
  .setName('register')
  .setDescription('Register your account with Yunami.');
export async function execute(interaction: any) {
  if (!interaction.isChatInputCommand()) return;
  const botUser = interaction.client.user;
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('Yunami Registration')
    .setDescription(
      'Welcome to **Yunami** – a co-op, turn-based anime adventure for up to **4 players**.\n' +
        'Use this panel to understand how to register and start your journey.'
    )
    .setThumbnail(botUser?.displayAvatarURL() ?? null)
    .addFields(
      {
        name: '🧾 What is Yunami?',
        value:
          '• Turn-based co-op combat against iconic anime-inspired bosses.\n' +
          '• Progress through branching stories with your party.\n' +
          '• Earn rewards, unlock routes, and build your team.',
      },
      {
        name: 'Gameplay Basics',
        value:
          '• Combat is **turn-based** – each player acts on their turn.\n' +
          '• Coordinate skills and ultimates to defeat bosses.\n' +
          '• Choices in dialogue affect story branches and rewards.',
      }
    )
    .setFooter({
      text: 'Yunami • Co-op Anime Adventures',
    })
    .setTimestamp();
  await interaction.reply({ embeds: [embed], components: [registerButtons] });
}
