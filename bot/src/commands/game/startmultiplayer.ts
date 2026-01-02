import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import {
  getPartyByOwner,
  areAllPlayersReady,
} from '../../quickstart/party-session.js';
import { storyGraph } from '../../quickstart/story-graph.js';

export const data = new SlashCommandBuilder()
  .setName('startmultiplayer')
  .setDescription('Start a multiplayer story session with your party.');

export async function execute(interaction: any) {
  if (!interaction.isChatInputCommand()) return;

  const party = await getPartyByOwner(interaction.user.id);

  if (!party) {
    await interaction.reply({
      content:
        'You are not the owner of a waiting party. Create one with `/party-create` first.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!areAllPlayersReady(party.id)) {
    await interaction.reply({
      content:
        'Cannot start yet: Not all players are ready. Use `/party-lobby` to ready up.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const episodes = storyGraph
    .listEpisodes()
    .filter((ep: any) => ep.id !== 'prologue_1');

  const embed = new EmbedBuilder()
    .setTitle('Choose Multiplayer Story')
    .setDescription('Select a story to play with your team:')
    .setColor(0x00b3b3);

  const row = new ActionRowBuilder<ButtonBuilder>();

  episodes.forEach((ep: any) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`mp_select_story_${ep.id}`)
        .setLabel(ep.title)
        .setStyle(ButtonStyle.Primary)
    );
  });

  await interaction.reply({
    embeds: [embed],
    components: [row],
  });
}
