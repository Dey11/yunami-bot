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
  mapRemotePartyToLocal,
} from '../../quickstart/party-session.js';
import { storyGraph } from '../../quickstart/story-graph.js';
import * as api from '../../api/client.js';

export const data = new SlashCommandBuilder()
  .setName('startmultiplayer')
  .setDescription('Start a multiplayer story session with your party.');

export async function execute(interaction: any) {
  if (!interaction.isChatInputCommand()) return;
  
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  
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
    await interaction.editReply({
      content: 'You are not the owner of a waiting party. Create one with `/party-create` first.',
    });
    return;
  }
  
  // Check if all players are ready
  // Note: Players local array might not be up to date if we just fetched from API, but mapRemotePartyToLocal handles it.
  const allReady = party.players.every((p: any) => p.isReady);
  if (!allReady) {
    await interaction.editReply({
      content: 'Cannot start yet: Not all players are ready. Use `/party-lobby` to ready up.',
    });
    return;
  }
  
  const episodes = storyGraph
    .listEpisodes()
    .filter((ep: any) => ep.id !== 'prologue_1');
  
  if (episodes.length === 0) {
    await interaction.editReply({
      content: 'No multiplayer stories available yet.',
    });
    return;
  }
  
  const embed = new EmbedBuilder()
    .setTitle('Choose Multiplayer Story')
    .setDescription('Select a story to play with your team:')
    .setColor(0x00b3b3);
  
  // Discord allows max 5 buttons per row, max 5 rows
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  let currentRow = new ActionRowBuilder<ButtonBuilder>();
  
  episodes.slice(0, 25).forEach((ep: any, index: number) => {
    if (index > 0 && index % 5 === 0) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder<ButtonBuilder>();
    }
    currentRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`mp_select_story_${ep.id}`)
        .setLabel(ep.title.substring(0, 80)) // Truncate long titles
        .setStyle(ButtonStyle.Primary)
    );
  });
  
  if (currentRow.components.length > 0) {
    rows.push(currentRow);
  }
  
  await interaction.editReply({
    embeds: [embed],
    components: rows,
  });
}
