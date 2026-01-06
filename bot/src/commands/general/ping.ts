import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with Pong! and latency stats');
export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply();
  const sent = await interaction.fetchReply();
  const latency = sent.createdTimestamp - interaction.createdTimestamp;
  await interaction.editReply(`Pong!\nLatency: ${latency}ms`);
}
