import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function buildStartButtons(episodeId: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`start:${episodeId}`)
      .setLabel('Confirm')
      .setStyle(ButtonStyle.Success)
  );
}
