import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const createProfileButtons = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId('createProfile')
    .setLabel('Create Profile')
    .setStyle(ButtonStyle.Success),

  new ButtonBuilder()
    .setCustomId('exit')
    .setLabel('Exit')
    .setStyle(ButtonStyle.Danger)
);
