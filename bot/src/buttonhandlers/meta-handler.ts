import { MessageFlags, EmbedBuilder } from 'discord.js';
import { getSession, endSession } from '../quickstart/runtime-graph.js';
import {
  finalizePrologueProfile,
  clearPrologueEvaluation,
  isPrologueActive,
} from '../engine/prologue-evaluator.js';
import * as api from '../api/client.js';
export const handler = {
  id: /^meta:(.+):(.+)$/,
  async execute(interaction: any) {
    const match = interaction.customId.match(/^meta:(.+):(.+)$/);
    if (!match) return;
    const [, nodeId, action] = match;
    const userId = interaction.user.id;
    const session = getSession(userId);
    if (!session) {
      await interaction.reply({
        content: 'No active session.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await interaction.deferUpdate();
    if (action === 'generate_profile') {
      if (!isPrologueActive(userId)) {
        await interaction.editReply({
          content: 'Prologue data not found.',
          embeds: [],
          components: [],
        });
        return;
      }
      const result = finalizePrologueProfile(userId);
      if (!result) {
        await interaction.editReply({
          content: 'Failed to generate profile.',
          embeds: [],
          components: [],
        });
        return;
      }
      const apiResponse = await api.completePrologue(userId, {
        baseStats: result.baseStats,
        personalityType: result.personalityType,
        startingInventory: result.startingInventory,
        dominantTraits: result.dominantTraits,
        personalityDescription: result.personalityDescription,
      });
      if (apiResponse.error) {
        console.error('Failed to save prologue results:', apiResponse.error);
      }
      const statsText = Object.entries(result.baseStats)
        .map(([stat, value]) => `**${stat.toUpperCase()}**: ${value}`)
        .join(' | ');
      const embed = new EmbedBuilder()
        .setTitle(result.personalityType)
        .setDescription(result.personalityDescription)
        .setColor(0x5865f2)
        .addFields(
          {
            name: 'Stats',
            value: statsText,
            inline: false,
          },
          {
            name: 'Traits',
            value:
              result.dominantTraits.length > 0
                ? result.dominantTraits.join(', ')
                : 'Balanced',
            inline: true,
          },
          {
            name: 'Starting Items',
            value: result.startingInventory
              .map((i) => i.replace(/_/g, ' '))
              .join(', '),
            inline: true,
          }
        )
        .setFooter({ text: 'Your journey begins now' });
      clearPrologueEvaluation(userId);
      endSession(userId);
      await interaction.editReply({
        embeds: [embed],
        components: [],
      });
    }
  },
};
