import { MessageFlags, EmbedBuilder } from 'discord.js';
import { getSession, endSession } from '../quickstart/runtime-graph.js';
// import { ... } from '../engine/prologue-evaluator.js'; // Removed
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
      const apiResponse = await api.completePrologue(userId);
      
      if (apiResponse.error) {
        // If already completed, show error nicely
        await interaction.editReply({
          content: `Failed to generate profile: ${apiResponse.error}`,
          embeds: [],
          components: [],
        });
        return;
      }

      if (!apiResponse.data) {
        await interaction.editReply({
          content: 'No profile data returned from server.',
        });
        return;
      }

      const { stats, traits, inventory, roleDescription, user: userData } = apiResponse.data;

      const statsText = Object.entries(stats || {})
        .map(([stat, value]) => `**${stat.toUpperCase()}**: ${value}`)
        .join(' | ');

      const embed = new EmbedBuilder()
        .setTitle(userData.role?.toUpperCase() || 'Unknown Role')
        .setDescription(roleDescription)
        .setColor(0x5865f2)
        .addFields(
          {
            name: 'Stats',
            value: statsText || 'None',
            inline: false,
          },
          {
            name: 'Traits',
            value: traits && traits.length > 0 ? traits.join(', ') : 'Balanced',
            inline: true,
          },
          {
            name: 'Starting Items',
            value: inventory
              ? inventory.map((i: string) => i.replace(/_/g, ' ')).join(', ')
              : 'None',
            inline: true,
          }
        )
        .setFooter({ text: 'Your journey begins now' });

      // No need to clear local state or end session locally, server handles it
      // endSession(userId); // Keeping session active might be desired? Or relying on server?
      // For now, let's keep endSession as it was there before, but it's local.
      endSession(userId); 

      await interaction.editReply({
        embeds: [embed],
        components: [],
      });
    }
  },
};
