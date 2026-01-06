import { createProfileButtons } from '../components/buttons/create-profile.js';
import { registerEmbed } from '../components/embeds/register.js';
import * as api from '../api/client.js';
import { logger } from '../utils/logger.js';
export const handler = {
  id: 'register',
  async execute(interaction: any) {
    const odId = interaction.user.id;
    const username = interaction.user.username;
    await interaction.deferReply({ ephemeral: true });
    const result = await api.register(odId, username);
    if (result.error && !result.error.includes('already')) {
      logger.error('Registration failed:', result.error);
      await interaction.editReply({
        content: 'Failed to register. Please try again.',
      });
      return;
    }
    await interaction.editReply({
      embeds: [registerEmbed],
      components: [createProfileButtons],
    });
  },
};

