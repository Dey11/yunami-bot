import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { storyGraph } from '../../quickstart/story-graph.js';
import {
  initSession,
  setResource,
  getResource,
  setActiveMessage,
} from '../../quickstart/runtime-graph.js';
import { loadAndRenderNode } from '../../engine/dispatcher.js';
export const data = new SlashCommandBuilder()
  .setName('showcase')
  .setDescription('Run the engine showcase story demonstrating all features.')
  .addIntegerOption((option) =>
    option
      .setName('credits')
      .setDescription('Starting credits (default: 10)')
      .setRequired(false)
      .setMinValue(0)
      .setMaxValue(100)
  );
export async function execute(interaction: any) {
  const odId = interaction.user.id;
  const startingCredits = interaction.options.getInteger('credits') ?? 10;
  const storyData = storyGraph.getStory('engine-showcase');
  if (!storyData) {
    await interaction.reply({
      content:
        'Showcase story not found. Make sure engine-showcase.json exists.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  initSession(odId, storyData.id, storyData.firstNodeId, storyData);
  setResource(odId, 'credits', startingCredits);
  const firstNode = storyData.nodes[storyData.firstNodeId];
  const result = await loadAndRenderNode(firstNode, odId);
  if (!result.allowed) {
    await interaction.reply({
      content: `Cannot start: ${result.reason}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const payload: any = {
    content: `**Engine Showcase** | Credits: ${getResource(odId, 'credits')}`,
    embeds: [result.result!.embed],
    components: result.result!.components ?? [],
    withResponse: true,
  };
  if (result.result!.attachment) {
    payload.files = [result.result!.attachment];
  }
  const response = await interaction.reply(payload);
  const message = response.resource?.message;
  if (message) {
    setActiveMessage(odId, message.channelId, message.id);
  }
}
